-- 018: the same 7-step journey for every account, old and new. Run after 017. Safe to re-run.
--  * sex_confirmed: old accounts were saved as male without asking; they confirm once (step 1)
--  * intake_completed_at: the screening intake counts on every device, not just one browser

alter table people add column if not exists sex_confirmed boolean not null default false;
alter table people add column if not exists intake_completed_at timestamptz;

-- people who chose their sex themselves (real profiles, demo people) are confirmed;
-- profiles made by the old automatic sample journey are not
update people p set sex_confirmed = true
where sex_confirmed = false
  and id not like 'p\_%'
  and not exists (select 1 from accounts a where a.person_id = p.id and a.title ilike '%sample journey%');

-- choosing or changing sex confirms it
create or replace function set_my_sex(p_sex text) returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if p_sex not in ('M', 'F') then raise exception 'Choose male or female'; end if;
  if has_real_couple(me) and (select sex from people where id = me) <> p_sex then
    raise exception 'You are linked to a partner; ask your counsellor to correct this';
  end if;
  update people set sex = p_sex, sex_confirmed = true where id = me;
  return p_sex;
end $$;
revoke all on function set_my_sex(text) from public, anon;
grant execute on function set_my_sex(text) to authenticated;

-- new profiles choose their sex, so they are confirmed from the start (009 + sex_confirmed)
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
  insert into people (id, name, short_name, sex, sex_confirmed) values
    (me, acc.display_name, split_part(acc.display_name, ' ', 1), p_sex, true)
  on conflict (id) do update set sex = excluded.sex, sex_confirmed = true;
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
drop trigger if exists people_confirm_new on people;
drop function if exists people_confirm_new();

-- the intake is done
create or replace function mark_intake_complete() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); t timestamptz := now();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  update people set intake_completed_at = t where id = me;
  return t;
end $$;
revoke all on function mark_intake_complete() from public, anon;
grant execute on function mark_intake_complete() to authenticated;

-- my journey state in one call
create or replace function my_journey() returns table (sex text, sex_confirmed boolean, intake_completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.sex::text, p.sex_confirmed, p.intake_completed_at from people p where p.id = my_person()
$$;
revoke all on function my_journey() from public, anon;
grant execute on function my_journey() to authenticated;
