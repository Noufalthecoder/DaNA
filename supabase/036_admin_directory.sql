-- 036: the admin account directory, and account suspension that is really enforced. Run after 035. Safe to re-run.
--
--   accounts.status            'active' | 'suspended' (+ reason and when)
--   my_role() / my_person()    return null for a suspended account, so every policy and function built on them
--                              denies it; in_admin_scope() also ignores a suspended admin
--   admin_directory(...)       accounts an admin may see: only inside their area (030/031 scope), filtered and paged.
--                              Shows no genetic or health data; email only for staff accounts, never for couples.
--   admin_directory_summary()  the counts for the same scope
--   admin_set_account_status() suspend (with a reason) or reactivate an account in the admin's area, audited.
--                              Nobody changes their own status, and only a nationwide admin changes another admin
--                              (so an active nationwide admin always remains).
-- Note: in_admin_scope() here replaces 031's version (it adds the suspension check). If 030/031 are ever re-run,
-- run this file again afterwards.

alter table accounts add column if not exists status text not null default 'active';
alter table accounts add column if not exists status_reason text;
alter table accounts add column if not exists status_changed_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_status_check') then
    alter table accounts add constraint accounts_status_check check (status in ('active', 'suspended'));
  end if;
end $$;

-- the status is changed only through admin_set_account_status(): nobody may update it directly (as 034)
revoke update on accounts from authenticated, anon;
grant update (display_name, dana_id, title) on accounts to authenticated;

-- a suspended account has no role and no person: it can still read its own account row (to be told why), nothing else
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from accounts where user_id = auth.uid() and status = 'active'
$$;

create or replace function my_person() returns text
language sql stable security definer set search_path = public as $$
  select person_id from accounts where user_id = auth.uid() and status = 'active'
$$;

-- 031's scope rule, and a suspended admin has no scope
create or replace function in_admin_scope(p bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when a.role <> 'admin' or a.status <> 'active' then false
      when a.scope_level = 'national' then true
      when p is null then false
      when a.scope_level = 'emirate' then loc_emirate(p) is not distinct from loc_emirate(a.location_id)
      else p = a.location_id
    end
    from accounts a where a.user_id = auth.uid()), false)
$$;

-- where an account belongs: a couple member's home, a counsellor's clinic, an admin's area
create or replace function _account_place(p_user uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.location_id from accounts a join people p on p.id = a.person_id where a.user_id = p_user),
    (select k.location_id from counsellors k where k.user_id = p_user order by k.location_id nulls last limit 1),
    (select a.location_id from accounts a where a.user_id = p_user))
$$;
revoke all on function _account_place(uuid) from public, anon, authenticated;

create or replace function admin_directory(
  p_search text default null, p_role text default null, p_sex text default null, p_status text default null,
  p_emirate text default null, p_location bigint default null, p_limit int default 25, p_offset int default 0
) returns table (
  user_id uuid, role text, display_name text, title text, email text, status text, status_reason text,
  sex text, location_id bigint, location_label text, emirate text, dana_id text, scope_level text, total bigint
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare q text := nullif(trim(p_search), '');
begin
  if my_role() is distinct from 'admin' then raise exception 'Only an administrator can open the account directory'; end if;
  return query
  with d as (
    select a.user_id, a.role, a.display_name, a.title,
           case when a.role in ('admin', 'counsellor') then a.email end as email,
           a.status, a.status_reason, p.sex::text as sex, _account_place(a.user_id) as loc, a.dana_id,
           case when a.role = 'admin' then a.scope_level end as scope_level
      from accounts a left join people p on p.id = a.person_id
  )
  select d.user_id, d.role, d.display_name, d.title, d.email, d.status, d.status_reason, d.sex,
         d.loc, loc_label(d.loc), loc_emirate(d.loc), d.dana_id, d.scope_level, count(*) over ()
    from d
   where in_admin_scope(d.loc)
     and (p_role is null or d.role = p_role)
     and (p_sex is null or d.sex = p_sex)
     and (p_status is null or d.status = p_status)
     and (p_emirate is null or loc_emirate(d.loc) = p_emirate)
     and (p_location is null or d.loc = p_location)
     and (q is null or d.display_name ilike '%' || q || '%' or coalesce(d.dana_id, '') ilike '%' || q || '%'
          or coalesce(d.email, '') ilike '%' || q || '%')
   order by case d.role when 'admin' then 0 when 'counsellor' then 1 else 2 end, d.display_name, d.user_id
   limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function admin_directory(text, text, text, text, text, bigint, int, int) from public, anon;
grant execute on function admin_directory(text, text, text, text, text, bigint, int, int) to authenticated;

create or replace function admin_directory_summary() returns table (
  total bigint, admins bigint, counsellors bigint, couples bigint, male bigint, female bigint, active bigint, suspended bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only an administrator can open the account directory'; end if;
  return query
  select count(*), count(*) filter (where a.role = 'admin'), count(*) filter (where a.role = 'counsellor'),
         count(*) filter (where a.role = 'couple'), count(*) filter (where p.sex = 'M'), count(*) filter (where p.sex = 'F'),
         count(*) filter (where a.status = 'active'), count(*) filter (where a.status = 'suspended')
    from accounts a left join people p on p.id = a.person_id
   where in_admin_scope(_account_place(a.user_id));
end $$;
revoke all on function admin_directory_summary() from public, anon;
grant execute on function admin_directory_summary() to authenticated;

create or replace function admin_set_account_status(p_user uuid, p_status text, p_reason text default null) returns text
language plpgsql security definer set search_path = public as $$
declare me accounts; t accounts; why text := nullif(trim(p_reason), '');
begin
  select * into me from accounts where user_id = auth.uid();
  if me.role is distinct from 'admin' or me.status <> 'active' then raise exception 'Only an administrator can change an account status'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'Unknown status: %', p_status; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own account status'; end if;
  select * into t from accounts where user_id = p_user;
  if not found then raise exception 'Account not found'; end if;
  if t.role = 'admin' and me.scope_level <> 'national' then
    raise exception 'Only a nationwide administrator can change another administrator';
  end if;
  if not in_admin_scope(_account_place(p_user)) then raise exception 'This account is outside your area'; end if;
  if p_status = 'suspended' and why is null then raise exception 'Give a reason for the suspension'; end if;
  if t.status = p_status then return t.display_name; end if;

  update accounts set status = p_status, status_reason = case when p_status = 'suspended' then why end,
                      status_changed_at = now()
   where user_id = p_user;
  -- a suspended counsellor takes no new bookings; reactivating them is a separate step in Counsellors & areas
  if p_status = 'suspended' then update counsellors set status = 'away' where user_id = p_user; end if;

  perform _audit(case when p_status = 'suspended' then 'Suspended account: ' else 'Reactivated account: ' end || t.display_name,
                 'accounts', p_user::text, jsonb_build_object('role', t.role, 'reason', why));
  return t.display_name;
end $$;
revoke all on function admin_set_account_status(uuid, text, text) from public, anon;
grant execute on function admin_set_account_status(uuid, text, text) to authenticated;
