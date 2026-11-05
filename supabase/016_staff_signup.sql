-- 016: choose your role at sign-up. Run after 015. Safe to re-run.
--
-- Couple: anyone (as before).
-- Counsellor / DoH admin: only with a staff access code. Counsellors can read every couple's
-- results, so the role is granted here in the database, never by the browser.
-- Codes live in staff_codes; nobody can read that table through the API.
-- The last statement prints the codes: give them only to real staff.

create table if not exists staff_codes (
  code        text primary key,
  role        text not null check (role in ('counsellor', 'admin')),
  max_uses    int  not null default 25 check (max_uses > 0),
  uses        int  not null default 0,
  expires_at  timestamptz not null default now() + interval '90 days',
  created_at  timestamptz not null default now()
);
alter table staff_codes enable row level security;          -- no policies: no direct access at all
revoke all on staff_codes from anon, authenticated;

-- one starting code per role (random, so it is not in GitHub). Re-running adds none if one is valid.
insert into staff_codes (code, role)
select 'STAFF-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)), r
from unnest(array['counsellor', 'admin']) r
where not exists (select 1 from staff_codes s where s.role = r and s.expires_at > now() and s.uses < s.max_uses);

create or replace function claim_staff_role(p_role text, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  acc accounts;
  sc  staff_codes;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_role not in ('counsellor', 'admin') then raise exception 'Choose counsellor or DoH admin'; end if;
  select * into acc from accounts where user_id = auth.uid() for update;
  if not found then raise exception 'No account for this login'; end if;
  if acc.role = p_role then return p_role; end if;
  if acc.role <> 'couple' or acc.person_id is not null then
    raise exception 'Staff roles can only be chosen when the account is first created';
  end if;
  select * into sc from staff_codes where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found or sc.role <> p_role or sc.expires_at < now() or sc.uses >= sc.max_uses then
    raise exception 'That staff access code is not valid for this role';
  end if;

  update staff_codes set uses = uses + 1 where code = sc.code;
  update accounts set role = p_role,
         title = case when p_role = 'counsellor' then 'Genetic counsellor (pending verification)' else 'DoH premarital programme' end
   where user_id = auth.uid();
  if p_role = 'counsellor' then
    -- 'away' until the programme verifies credentials, so no cases are auto-assigned yet
    insert into counsellors (user_id, name, status, credentials_verified)
    values (auth.uid(), acc.display_name, 'away', false)
    on conflict (user_id) do nothing;
  end if;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), acc.display_name, 'Signed up as ' || case when p_role = 'admin' then 'DoH admin' else p_role end || ' with a staff code',
          'accounts', auth.uid()::text);
  return p_role;
end $$;
revoke all on function claim_staff_role(text, text) from public, anon;
grant execute on function claim_staff_role(text, text) to authenticated;

-- your staff codes (keep private)
select role, code, max_uses - uses as uses_left, expires_at::date as expires
from staff_codes where expires_at > now() and uses < max_uses order by role;
