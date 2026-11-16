-- 035: home location from UAE PASS. Run after 034. Safe to re-run.
--
-- UAE PASS returns the person's home address (emirate and area). When it arrives, DaNA keeps it on the
-- identity and fills the person's location column (people.location_id) with the matching place, but only
-- if the person has not chosen one: the person can always change it (set_my_location, onboarding, Profile).
--
-- SIMULATED like the rest of link_uaepass(): real UAE PASS is not connected yet, so the home area is a
-- stable pick from public.locations for each account. With real UAE PASS, only _uaepass_home_place()
-- changes: it maps the returned emirate/area text to a locations row instead.

alter table uaepass_identity add column if not exists home_emirate text;
alter table uaepass_identity add column if not exists home_area text;
alter table uaepass_identity add column if not exists home_location_id bigint references locations (id) on delete set null;

-- the place UAE PASS gives for this identity (simulated: stable per UAE PASS subject)
create or replace function _uaepass_home_place(p_sub text) returns bigint
language plpgsql stable security definer set search_path = public as $$
declare n int; k int;
begin
  select count(*) into n from locations where coalesce(country_code, 'AE') = 'AE';
  if n = 0 then return null; end if;
  k := ((('x' || substr(md5(p_sub), 21, 8))::bit(32)::bigint & 2147483647) % n)::int;
  return (select id from locations where coalesce(country_code, 'AE') = 'AE' order by id offset k limit 1);
end $$;
revoke all on function _uaepass_home_place(text) from public, anon, authenticated;

-- store the UAE PASS home area on the identity, then fill people.location_id if it is still empty
create or replace function _apply_uaepass_home(p_person text) returns void
language plpgsql security definer set search_path = public as $$
declare i uaepass_identity; place bigint;
begin
  select * into i from uaepass_identity where person_id = p_person;
  if not found then return; end if;
  place := coalesce(i.home_location_id, _uaepass_home_place(i.uaepass_sub));
  if place is null then return; end if;
  update uaepass_identity u
     set home_location_id = place,
         home_area = l.city,
         home_emirate = coalesce(nullif(trim(l.state_name), ''), l.city)
    from locations l
   where u.person_id = p_person and l.id = place and u.home_location_id is null;
  update people set location_id = place where id = p_person and location_id is null;
end $$;
revoke all on function _apply_uaepass_home(text) from public, anon, authenticated;

-- link_uaepass (029) + the home area. Body as in 029; the two new lines call _apply_uaepass_home.
create or replace function link_uaepass(p_via_uaepass_signin boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me   text := my_person();
  acc  accounts;
  h    text;
  yr   int;
  dob  date;
  eid  text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if exists (select 1 from uaepass_identity where person_id = me) then
    perform _apply_uaepass_home(me);
    return (select to_jsonb(i) from uaepass_identity i where person_id = me);
  end if;
  select * into acc from accounts where user_id = auth.uid();
  -- simulated attributes, stable for this account (real UAE PASS returns them in the ID token)
  h   := md5(auth.uid()::text);
  yr  := 1988 + (('x' || substr(h, 1, 4))::bit(16)::int % 15);
  dob := make_date(yr, 1 + (('x' || substr(h, 5, 2))::bit(8)::int % 12), 1 + (('x' || substr(h, 7, 2))::bit(8)::int % 28));
  eid := '784-' || yr || '-' || lpad(((('x' || substr(h, 9, 8))::bit(32)::bigint & 2147483647) % 10000000)::text, 7, '0')
         || '-' || ((('x' || substr(h, 17, 2))::bit(8)::int) % 10);
  insert into uaepass_identity (person_id, uaepass_sub, full_name_en, emirates_id, date_of_birth, sex, nationality, mobile, email)
  values (me, 'sim-' || substr(h, 1, 20), coalesce(acc.display_name, 'DaNA member'), eid, dob,
          (select sex from people where id = me), 'United Arab Emirates',
          '+9715' || lpad(((('x' || substr(h, 19, 8))::bit(32)::bigint & 2147483647) % 100000000)::text, 8, '0'),
          acc.email);
  perform _apply_uaepass_home(me);
  update people set uaepass_linked_at = now(), uaepass_via = case when p_via_uaepass_signin then 'uaepass' else 'linked' end
   where id = me;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), acc.display_name,
          case when p_via_uaepass_signin then 'Signed in with UAE PASS (simulated)' else 'Linked UAE PASS to the account (simulated)' end,
          'uaepass_identity', me);
  return (select to_jsonb(i) from uaepass_identity i where person_id = me);
end $$;
revoke all on function link_uaepass(boolean) from public, anon;
grant execute on function link_uaepass(boolean) to authenticated;

-- people who linked UAE PASS before this migration get their home area now (an existing choice is kept)
do $$
declare r record;
begin
  for r in select person_id from uaepass_identity where home_location_id is null loop
    perform _apply_uaepass_home(r.person_id);
  end loop;
end $$;
