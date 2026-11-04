-- =====================================================================
-- Run AFTER 002_signup.sql (SQL Editor -> New query -> Run). Safe to re-run.
-- Gives every new couple account (Google or email sign-up) its own SAMPLE
-- journey: the user + a sample partner, both carriers of HBB, so they land in
-- the full app straight away. Nobody shares data with anyone else.
-- TEMPORARY: the real onboarding (UAE PASS + Malaffi results + partner invite)
-- replaces this function.
-- =====================================================================
create or replace function start_sample_journey() returns text
language plpgsql security definer set search_path = public as $$
declare
  acc      accounts;
  tag      text := left(replace(auth.uid()::text, '-', ''), 12);
  me       text := 'u_' || tag;
  partner  text := 'p_' || tag;
  cid      text := 'k_' || tag;
begin
  select * into acc from accounts where user_id = auth.uid();
  if not found then raise exception 'No account for this login'; end if;
  if acc.person_id is not null then return acc.person_id; end if;   -- already set up
  if acc.role <> 'couple' then return null; end if;                 -- staff never get one

  insert into people (id, name, short_name, sex) values
    (me, acc.display_name, split_part(acc.display_name, ' ', 1), 'M'),
    (partner, 'Sample partner', 'Your partner', 'F')
  on conflict (id) do nothing;

  insert into results (person_id, gene, reported_on, malaffi_ref) values
    (me, 'HBB', current_date, 'sample'),
    (partner, 'HBB', current_date, 'sample')
  on conflict (person_id) do nothing;

  insert into couples (id, partner_a, partner_b, stage, screened_on)
  values (cid, me, partner, 'engaged', current_date)
  on conflict (id) do nothing;

  insert into consents (person_id, kind, granted)
  select p, kd, true
  from unnest(array[me, partner]) as p
  cross join unnest(array['share_partner', 'share_counsellor', 'faith_cards']) as kd
  on conflict (person_id, kind) do nothing;

  update accounts set person_id = me, title = 'Partner · engaged (sample journey)' where user_id = auth.uid();
  return me;
end $$;

grant execute on function start_sample_journey() to authenticated;
