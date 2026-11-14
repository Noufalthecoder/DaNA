-- 021: connect only by DaNA ID. Run after 019. Safe to re-run.
--
-- Why: searching by name lets anyone find anyone and send unwanted requests.
-- Now a partner is found only with the exact DaNA ID they shared with you (or the invite code).
--   * find_partner(): exact DaNA ID only, shows first name + initial, rate limited (10 lookups / 10 min).
--   * send_connection_request(): the only way to send an in-app request. Checks: real profile,
--     opposite sex, neither already linked, no duplicate, max 3 pending sent, max 10 sent per day.
--     If the other person already asked you, sending accepts their request instead.
--   * Direct inserts of in-app requests are closed; only WhatsApp/email invite records may be inserted.

-- 1. lookup log for rate limiting ---------------------------------------------------
create table if not exists public.partner_lookups (
  id         bigserial primary key,
  user_id    uuid not null,
  found      boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_partner_lookups_user on public.partner_lookups (user_id, created_at);
alter table public.partner_lookups enable row level security;
revoke all on public.partner_lookups from public, anon, authenticated;

-- 2. find by exact DaNA ID only -------------------------------------------------------
drop function if exists find_partner(text);
create or replace function find_partner(q text) returns table (
  person_id text, display_name text, avatar text, sex text, dana_id text, email_hint text
)
language plpgsql volatile security definer set search_path = public as $$
declare
  me     text := my_person();
  my_sex text := (select p.sex from people p where p.id = my_person());
  clean  text := upper(regexp_replace(coalesce(q, ''), '\s+', '', 'g'));
  n      int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if me is null then raise exception 'Create your profile first'; end if;
  if clean ~ '^[0-9A-F]{6}$' then clean := 'DANA-' || clean; end if;
  if clean !~ '^DANA-[0-9A-F]{6}$' then
    raise exception 'Enter a DaNA ID like DANA-3F9A2C. Ask your partner for theirs.';
  end if;
  select count(*) into n from partner_lookups
   where user_id = auth.uid() and created_at > now() - interval '10 minutes';
  if n >= 10 then raise exception 'Too many searches. Wait a few minutes and try again.'; end if;

  return query
    select a.person_id,
           split_part(btrim(a.display_name), ' ', 1)
             || coalesce(' ' || nullif(left(split_part(btrim(a.display_name), ' ', 2), 1), '') || '.', ''),
           a.avatar, p.sex::text,
           'DANA-' || upper(substr(a.person_id, 3, 6)),
           null::text
    from accounts a
    join people p on p.id = a.person_id
    where a.role = 'couple'
      and a.person_id is distinct from me
      and p.sex <> my_sex
      and 'DANA-' || upper(substr(a.person_id, 3, 6)) = clean
      and not has_real_couple(a.person_id)
    limit 1;

  insert into partner_lookups (user_id, found) values (auth.uid(), found);
end $$;
revoke all on function find_partner(text) from public, anon;
grant execute on function find_partner(text) to authenticated;

-- 3. sending a request: server-checked ------------------------------------------------
create or replace function send_connection_request(p_to text, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  me  text := my_person();
  rid uuid;
  n   int;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if p_to is null or p_to = me then raise exception 'You cannot send a request to yourself'; end if;
  if not exists (select 1 from accounts where person_id = p_to and role = 'couple') then
    raise exception 'That DaNA ID was not found';
  end if;
  if not opposite_sex(me, p_to) then
    raise exception 'Premarital screening links a woman and a man.';
  end if;
  if has_real_couple(me) then raise exception 'You are already linked to a partner'; end if;
  if has_real_couple(p_to) then raise exception 'This person is already linked to a partner'; end if;

  -- they already asked me: accept theirs instead of making a second request
  select id into rid from connection_requests
   where sender_id = p_to and receiver_id = me and status = 'PENDING' limit 1;
  if rid is not null then return accept_connection_request(rid); end if;

  if exists (select 1 from connection_requests
             where sender_id = me and receiver_id = p_to and status = 'PENDING') then
    raise exception 'You already sent this person a request';
  end if;
  select count(*) into n from connection_requests
   where sender_id = me and status = 'PENDING' and channel = 'in_app' and receiver_id is not null;
  if n >= 3 then raise exception 'You have 3 requests waiting. Cancel one before sending another.'; end if;
  select count(*) into n from connection_requests
   where sender_id = me and channel = 'in_app' and created_at > now() - interval '1 day';
  if n >= 10 then raise exception 'Daily request limit reached. Try again tomorrow.'; end if;

  insert into connection_requests (sender_id, receiver_id, channel, status, note)
  values (me, p_to, 'in_app', 'PENDING', nullif(left(btrim(coalesce(p_note, '')), 250), ''))
  returning id into rid;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          'Sent connection request', 'connection_requests', rid::text);
  return rid::text;
end $$;
revoke all on function send_connection_request(text, text) from public, anon;
grant execute on function send_connection_request(text, text) to authenticated;

-- 4. no direct in-app inserts; WhatsApp / email invite records only ----------------------
drop policy if exists conn_req_send on public.connection_requests;
create policy conn_req_send on public.connection_requests for insert to authenticated
  with check (sender_id = any (my_ids()) and status = 'PENDING' and accepted = false
              and receiver_id is null and channel in ('whatsapp', 'gmail'));
