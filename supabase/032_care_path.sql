-- 032: traceable care path (challenge points 3 and 5). Run after 031. Safe to re-run.
--   Result -> Counselling -> Confirmatory test -> Specialist referral, each with a status and a date.
--   my_care_path()                       the couple's own path (couple members only)
--   update_care_step(couple, step, st)   counsellor marks counselling / confirmatory test
--   set_referral_status(id, st)          counsellor moves a referral on (sent -> accepted -> completed)
-- Complex findings are already routed: upsert_case assigns every case to a counsellor; the app tells the couple
-- a counsellor will contact them when the case is tier 1-2 or has an uncertain finding.

alter table clinical_cases add column if not exists counselled_at timestamptz;
alter table clinical_cases add column if not exists confirm_status text not null default 'not_started';
alter table clinical_cases drop constraint if exists clinical_cases_confirm_status_check;
alter table clinical_cases add constraint clinical_cases_confirm_status_check
  check (confirm_status in ('not_started', 'not_needed', 'needed', 'booked', 'done'));
alter table clinical_cases add column if not exists confirm_updated_at timestamptz;
alter table referrals add column if not exists updated_at timestamptz;

create or replace function my_care_path() returns jsonb
language sql stable security definer set search_path = public as $$
  with k as (select * from clinical_cases where couple_id = my_couple() and my_couple() is not null),
  req as (
    select min(created_at) filter (where status <> 'CANCELLED') as requested_at,
           min(coalesce(responded_at, created_at)) filter (where status = 'CONFIRMED') as confirmed_at
    from consultation_requests where couple_id = my_couple()
  ),
  appt as (
    select min(starts_at) filter (where status = 'booked') as next_at,
           max(starts_at) filter (where status = 'done') as done_at
    from appointments where couple_id = my_couple()
  )
  select case when not exists (select 1 from k) then null else jsonb_build_object(
    'tier', k.triage_tier,
    'result_at', k.created_at,
    'has_uncertain', exists (select 1 from genetic_reports r join genetic_variants v on v.report_id = r.id
                             join couples c on r.person_id in (c.partner_a, c.partner_b)
                             where c.id = k.couple_id and v.clinical_significance = 'vus'),
    'counsellor', (select n.name from case_assignments a join counsellors n on n.id = a.counsellor_id
                   where a.case_id = k.id and a.status = 'active' limit 1),
    'counselling', case
        when k.counselled_at is not null or k.workflow_status in ('counselled', 'closed') or appt.done_at is not null then 'done'
        when appt.next_at is not null or req.confirmed_at is not null then 'booked'
        when req.requested_at is not null then 'requested'
        else 'not_started' end,
    'counselling_at', coalesce(k.counselled_at, appt.done_at, appt.next_at, req.confirmed_at, req.requested_at),
    'confirm', k.confirm_status,
    'confirm_at', k.confirm_updated_at,
    'referrals', coalesce((select jsonb_agg(jsonb_build_object('destination', f.destination, 'status', f.status,
                     'created_at', f.created_at, 'updated_at', f.updated_at) order by f.created_at)
                   from referrals f where f.case_id = k.id and f.status <> 'draft'), '[]'))
  end
  from k, req, appt
$$;
revoke all on function my_care_path() from public, anon;
grant execute on function my_care_path() to authenticated;

create or replace function update_care_step(p_couple text, p_step text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_case uuid;
begin
  if my_role() is distinct from 'counsellor' then raise exception 'Only a counsellor can update the care path'; end if;
  select id into v_case from clinical_cases where couple_id = p_couple;
  if v_case is null then raise exception 'No case for this couple'; end if;
  if p_step = 'counselling' then
    if p_status not in ('done', 'not_done') then raise exception 'Invalid status'; end if;
    update clinical_cases set counselled_at = case when p_status = 'done' then now() end,
      workflow_status = case when p_status = 'done' then 'counselled' else 'in_review' end, updated_at = now()
    where id = v_case;
  elsif p_step = 'confirm' then
    if p_status not in ('not_started', 'not_needed', 'needed', 'booked', 'done') then raise exception 'Invalid status'; end if;
    update clinical_cases set confirm_status = p_status, confirm_updated_at = now(), updated_at = now() where id = v_case;
  else
    raise exception 'Unknown step';
  end if;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          'Care path: ' || p_step || ' set to ' || p_status, 'couples', p_couple);
end $$;
revoke all on function update_care_step(text, text, text) from public, anon;
grant execute on function update_care_step(text, text, text) to authenticated;

create or replace function set_referral_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_couple text;
begin
  if my_role() is distinct from 'counsellor' then raise exception 'Only a counsellor can update a referral'; end if;
  if p_status not in ('sent', 'accepted', 'completed') then raise exception 'Invalid status'; end if;
  update referrals f set status = p_status, updated_at = now() where f.id = p_id
  returning (select couple_id from clinical_cases where id = f.case_id) into v_couple;
  if v_couple is null then raise exception 'Referral not found'; end if;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          'Referral marked ' || p_status, 'couples', v_couple);
end $$;
revoke all on function set_referral_status(uuid, text) from public, anon;
grant execute on function set_referral_status(uuid, text) to authenticated;

-- what the counsellor's controls show for one couple
create or replace function counsellor_care_path(p_couple text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('counselled', counselled_at is not null or workflow_status in ('counselled', 'closed'),
                            'confirm', confirm_status)
  from clinical_cases where couple_id = p_couple and my_role() = 'counsellor'
$$;
revoke all on function counsellor_care_path(text) from public, anon;
grant execute on function counsellor_care_path(text) to authenticated;
