-- 010: Connections page requests, stored safely. Run after 009. Safe to re-run.
--
-- Only the two people involved can see a request. Nobody can write couples, people
-- or accounts directly: a couple is created only by accept_connection_request()
-- (receiver accepts a real request) or accept_partner_invite() (partner enters a code).
-- This replaces an earlier draft that opened accounts/people/couples to everyone.

-- 1. table (as used by the Connections page) -----------------------------------
create table if not exists public.connection_requests (
  id                 uuid primary key default gen_random_uuid(),
  sender_id          text not null,
  receiver_id        text,                 -- person id, login id or email
  recipient_email    text,
  recipient_phone    text,
  channel            varchar(20) default 'in_app' check (channel in ('in_app', 'whatsapp', 'gmail')),
  invitation_sent    boolean default true,
  invitation_sent_at timestamptz default now(),
  accepted           boolean default false,
  accepted_at        timestamptz,
  status             varchar(24) not null default 'PENDING'
                     check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  note               text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table public.connection_requests add column if not exists note text;
create index if not exists idx_conn_requests_receiver on public.connection_requests (receiver_id, status);
create index if not exists idx_conn_requests_sender   on public.connection_requests (sender_id, status);
create index if not exists idx_conn_requests_email    on public.connection_requests (recipient_email, status);

-- 2. undo anything the earlier open draft may have created ----------------------
drop policy if exists "allow_all_connection_requests_select" on public.connection_requests;
drop policy if exists "allow_all_connection_requests_insert" on public.connection_requests;
drop policy if exists "allow_all_connection_requests_update" on public.connection_requests;
drop policy if exists "allow_all_connection_requests_delete" on public.connection_requests;
drop policy if exists "couples_read_all"    on public.couples;
drop policy if exists "couples_insert_all"  on public.couples;
drop policy if exists "couples_update_all"  on public.couples;
drop policy if exists "accounts_search_all" on public.accounts;
drop policy if exists "people_read_all"     on public.people;
drop policy if exists "people_insert_all"   on public.people;
drop policy if exists "people_update_all"   on public.people;
revoke all on public.connection_requests from anon;

-- 3. who I am, in every form a request may use ----------------------------------
create or replace function my_ids() returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[a.person_id, a.user_id::text, lower(a.email)], null)
  from accounts a where a.user_id = auth.uid()
$$;
revoke all on function my_ids() from public, anon;
grant execute on function my_ids() to authenticated;

-- 4. requests: visible to sender and receiver only --------------------------------
alter table public.connection_requests enable row level security;
grant select, insert, update on public.connection_requests to authenticated;

drop policy if exists conn_req_read on public.connection_requests;
create policy conn_req_read on public.connection_requests for select to authenticated
  using (sender_id = any (my_ids()) or receiver_id = any (my_ids()) or lower(recipient_email) = any (my_ids()));

drop policy if exists conn_req_send on public.connection_requests;
create policy conn_req_send on public.connection_requests for insert to authenticated
  with check (sender_id = any (my_ids()) and status = 'PENDING' and accepted = false);

-- sender may cancel; receiver may reject. Accepting goes through accept_connection_request().
drop policy if exists conn_req_update on public.connection_requests;
create policy conn_req_update on public.connection_requests for update to authenticated
  using (sender_id = any (my_ids()) or receiver_id = any (my_ids()) or lower(recipient_email) = any (my_ids()))
  with check (status in ('PENDING', 'REJECTED', 'CANCELLED') and accepted = false);

-- 5. one place that links two people into a couple ---------------------------------
create or replace function link_couple(p_a text, p_b text, p_how text) returns text
language plpgsql security definer set search_path = public as $$
declare cid text := 'k_' || left(md5(p_a || p_b), 12);
begin
  if p_a = p_b then raise exception 'You cannot link with yourself'; end if;
  if not exists (select 1 from people where id = p_a) or not exists (select 1 from people where id = p_b) then
    raise exception 'Both people need a DaNA profile first';
  end if;
  if exists (select 1 from couples where p_a in (partner_a, partner_b) or p_b in (partner_a, partner_b)) then
    raise exception 'One of you is already linked to a partner';
  end if;
  insert into couples (id, partner_a, partner_b, stage, screened_on) values (cid, p_a, p_b, 'engaged', current_date);
  update accounts set title = 'Partner · engaged' where person_id in (p_a, p_b);
  perform upsert_case(cid);
  update counsellors k set active_caseload = (select count(*) from case_assignments a
    where a.counsellor_id = k.id and a.status = 'active') where true;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()), 'Linked with a partner (' || p_how || ')', 'couples', cid);
  return cid;
end $$;
revoke all on function link_couple(text, text, text) from public, anon, authenticated;

-- partner code (009) now uses the same linking
create or replace function accept_partner_invite(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); inv partner_invites; cid text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if my_couple() is not null then raise exception 'You are already linked to a partner'; end if;
  select * into inv from partner_invites where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'That code was not found. Check it and try again.'; end if;
  if inv.from_person = me then raise exception 'That is your own code. Send it to your partner.'; end if;
  if inv.accepted_by is not null then raise exception 'That code has already been used'; end if;
  if inv.expires_at < now() then raise exception 'That code has expired. Ask your partner for a new one.'; end if;
  cid := link_couple(inv.from_person, me, 'invite code');
  update partner_invites set accepted_by = me, accepted_at = now() where code = inv.code;
  return cid;
end $$;

-- 6. accept a Connections request: the request is the sender's consent, accepting is mine
create or replace function accept_connection_request(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); req connection_requests; sender text; cid text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  select * into req from connection_requests where id = p_id for update;
  if not found then raise exception 'Request not found'; end if;
  if req.status <> 'PENDING' then raise exception 'This request is no longer pending'; end if;
  -- coalesce: a missing email must count as "not you", never as unknown
  if not (coalesce(req.receiver_id = any (my_ids()), false) or coalesce(lower(req.recipient_email) = any (my_ids()), false)) then
    raise exception 'This request was not sent to you';
  end if;
  -- the sender may be stored by person id or login id
  select coalesce(a.person_id, req.sender_id) into sender from accounts a
   where a.person_id = req.sender_id or a.user_id::text = req.sender_id limit 1;
  sender := coalesce(sender, req.sender_id);
  cid := link_couple(sender, me, 'connection request');
  update connection_requests set status = 'ACCEPTED', accepted = true, accepted_at = now(), updated_at = now() where id = p_id;
  return cid;
end $$;
revoke all on function accept_partner_invite(text), accept_connection_request(uuid) from public, anon;
grant execute on function accept_partner_invite(text), accept_connection_request(uuid) to authenticated;
