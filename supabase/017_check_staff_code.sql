-- 017: check a staff access code BEFORE the account is created, so a wrong code stops sign-up.
-- Run after 016. Safe to re-run. Only yes/no is returned; the codes stay unreadable.

create or replace function check_staff_code(p_role text, p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_codes
    where code = upper(btrim(coalesce(p_code, '')))
      and role = p_role
      and expires_at > now()
      and uses < max_uses
  )
$$;
revoke all on function check_staff_code(text, text) from public;
grant execute on function check_staff_code(text, text) to anon, authenticated;
