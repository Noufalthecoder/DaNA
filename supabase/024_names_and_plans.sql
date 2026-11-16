-- 024: the partner sees your real name, and plan choices match the app. Run after 023. Safe to re-run.

-- 1. editing your name also updates the profile your partner sees
create or replace function set_display_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare n text := left(regexp_replace(btrim(coalesce(new_name, '')), '\s+', ' ', 'g'), 80);
begin
  if length(n) < 2 then raise exception 'Enter your name'; end if;
  update accounts set display_name = n where user_id = auth.uid();
  update people set name = n, short_name = split_part(n, ' ', 1)
   where id = (select person_id from accounts where user_id = auth.uid());
  return n;
end $$;
revoke all on function set_display_name(text) from public, anon;
grant execute on function set_display_name(text) to authenticated;

-- backfill: profiles still showing an old or placeholder name
update people p set name = a.display_name, short_name = split_part(a.display_name, ' ', 1)
  from accounts a
 where a.person_id = p.id and a.display_name is not null and p.name is distinct from a.display_name;

-- 2. plan choices (the app now sends exactly these)
alter table plans drop constraint if exists plans_choice_check;
alter table plans add constraint plans_choice_check
  check (choice in ('IVF with embryo testing', 'Prenatal testing', 'Proceed fully informed'));
