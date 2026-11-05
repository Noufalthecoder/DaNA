-- 009: real onboarding. A new couple account creates its own profile (no sample partner),
-- fetches its result from Malaffi through the API, then links a partner with an invite code.
-- Run after 008. Safe to re-run.

-- 1. my own profile -------------------------------------------------------
create or replace function start_my_profile(p_sex text) returns text
language plpgsql security definer set search_path = public as $$
declare
  acc accounts;
  me  text := 'u_' || left(replace(auth.uid()::text, '-', ''), 12);
begin
  select * into acc from accounts where user_id = auth.uid();
  if not found then raise exception 'No account for this login'; end if;
  if acc.person_id is not null then return acc.person_id; end if;
  if acc.role <> 'couple' then raise exception 'Only couple accounts have a health profile'; end if;
  if p_sex not in ('M', 'F') then raise exception 'Choose male or female'; end if;

  insert into people (id, name, short_name, sex) values
    (me, acc.display_name, split_part(acc.display_name, ' ', 1), p_sex)
  on conflict (id) do update set sex = excluded.sex;
  -- defaults the person can change on the Privacy page
  insert into consents (person_id, kind, granted)
  select me, k, true from unnest(array['share_partner', 'share_counsellor']) k
  on conflict (person_id, kind) do nothing;
  update accounts set person_id = me, title = 'Profile created' where user_id = auth.uid();
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), acc.display_name, 'Created a health profile', 'people', me);
  return me;
end $$;
revoke all on function start_my_profile(text) from public, anon;
grant execute on function start_my_profile(text) to authenticated;

-- 2. partner invite codes -------------------------------------------------
create table if not exists partner_invites (
  code        text primary key,
  from_person text not null references people (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_by text references people (id),
  accepted_at timestamptz
);
alter table partner_invites enable row level security;
drop policy if exists invites_own on partner_invites;
create policy invites_own on partner_invites for select to authenticated
  using (from_person = my_person() or accepted_by = my_person());

-- my current invite code (reused while it is still valid)
create or replace function create_partner_invite() returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); c text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if my_couple() is not null then raise exception 'You are already linked to a partner'; end if;
  select code into c from partner_invites
   where from_person = me and accepted_by is null and expires_at > now()
   order by created_at desc limit 1;
  if c is not null then return c; end if;
  loop
    -- 6 characters, no look-alikes (0/O, 1/I)
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
          from generate_series(1, 6));
    exit when not exists (select 1 from partner_invites where code = c);
  end loop;
  insert into partner_invites (code, from_person) values (c, me);
  return c;
end $$;

-- the partner enters the code: this is their consent to link; the couple and its case are created
create or replace function accept_partner_invite(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me  text := my_person();
  inv partner_invites;
  cid text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if my_couple() is not null then raise exception 'You are already linked to a partner'; end if;
  select * into inv from partner_invites where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'That code was not found. Check it and try again.'; end if;
  if inv.from_person = me then raise exception 'That is your own code. Send it to your partner.'; end if;
  if inv.accepted_by is not null then raise exception 'That code has already been used'; end if;
  if inv.expires_at < now() then raise exception 'That code has expired. Ask your partner for a new one.'; end if;
  if exists (select 1 from couples where inv.from_person in (partner_a, partner_b)) then
    raise exception 'Your partner is already linked to someone else';
  end if;

  cid := 'k_' || left(md5(inv.from_person || me), 12);
  insert into couples (id, partner_a, partner_b, stage, screened_on)
  values (cid, inv.from_person, me, 'engaged', current_date);
  update partner_invites set accepted_by = me, accepted_at = now() where code = inv.code;
  update accounts set title = 'Partner · engaged' where person_id in (inv.from_person, me);
  perform upsert_case(cid);
  update counsellors k set active_caseload = (select count(*) from case_assignments a
    where a.counsellor_id = k.id and a.status = 'active') where true;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          'Linked with a partner (invite accepted)', 'couples', cid);
  return cid;
end $$;
revoke all on function create_partner_invite(), accept_partner_invite(text) from public, anon;
grant execute on function create_partner_invite(), accept_partner_invite(text) to authenticated;

-- 3. a couple member's case is re-scored when their result arrives (called by the API) ----
create or replace function rescore_my_case(p_person text) returns void
language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  select id into cid from couples where p_person in (partner_a, partner_b);
  if cid is not null then perform upsert_case(cid); end if;
end $$;
revoke all on function rescore_my_case(text) from public, anon, authenticated;
