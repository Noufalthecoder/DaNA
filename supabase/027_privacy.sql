-- 027: privacy you can see and act on. Run after 026. Safe to re-run.
--   log_case_view(couple)        a counsellor/admin opening a case is recorded against that couple
--   who_saw_my_data()            everyone else who viewed or changed my data: who, their role, what, when
--   my_consent_status()          the Malaffi consent: given, when, version, withdrawn
--   withdraw_malaffi_consent(p_delete)  stop DaNA reading Malaffi; optionally delete the results already fetched

create or replace function log_case_view(p_couple text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() not in ('counsellor', 'admin') then return; end if;
  -- at most one entry per person, case and hour, so the list stays readable
  if exists (select 1 from audit_log where actor = auth.uid() and resource_type = 'couples' and resource_id = p_couple
             and action = 'Viewed the case and lab reports' and at > now() - interval '1 hour') then return; end if;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          'Viewed the case and lab reports', 'couples', p_couple);
end $$;
revoke all on function log_case_view(text) from public, anon;
grant execute on function log_case_view(text) to authenticated;

create or replace function who_saw_my_data() returns table (at timestamptz, who text, role text, action text)
language sql stable security definer set search_path = public as $$
  with me as (select my_person() as pid),
  mine as (
    select pid as id from me
    union select c.id from couples c, me where me.pid in (c.partner_a, c.partner_b)
    union select k.id::text from clinical_cases k join couples c on c.id = k.couple_id, me where me.pid in (c.partner_a, c.partner_b)
  )
  select l.at, l.actor_name,
         case a.role when 'couple' then 'Partner' when 'counsellor' then 'Counsellor' when 'admin' then 'Programme admin' else 'DaNA' end,
         l.action
  from audit_log l
  left join accounts a on a.user_id = l.actor
  where l.actor is distinct from auth.uid()
    and l.resource_id in (select id from mine)
  order by l.at desc
  limit 100
$$;
revoke all on function who_saw_my_data() from public, anon;
grant execute on function who_saw_my_data() to authenticated;

create or replace function my_consent_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('granted', c.granted, 'version', c.version, 'updated_at', c.updated_at, 'revoked_at', c.revoked_at)
                   from consents c where c.person_id = my_person() and c.kind = 'malaffi_access'), '{"granted": false}'::jsonb)
$$;
revoke all on function my_consent_status() from public, anon;
grant execute on function my_consent_status() to authenticated;

create or replace function withdraw_malaffi_consent(p_delete boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); n int := 0;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  update consents set granted = false, revoked_at = now(), updated_at = now()
   where person_id = me and kind = 'malaffi_access';
  if p_delete then
    delete from genetic_variants where report_id in (select id from genetic_reports where person_id = me);
    delete from genetic_reports where person_id = me;
    get diagnostics n = row_count;
    -- blood results already used in a signed-off couple cross-check stay (that record cannot change)
    delete from lab_results l where l.person_id = me
      and not exists (select 1 from risk_assessments r where l.id in (r.male_lab_id, r.female_lab_id));
    delete from medical_records where person_id = me;
    delete from results where person_id = me;
    begin perform rescore_my_case(me); exception when others then null; end;
  end if;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          case when p_delete then 'Withdrew Malaffi consent and deleted fetched results' else 'Withdrew Malaffi consent' end,
          'consents', me);
  return jsonb_build_object('withdrawn', true, 'deleted_reports', n);
end $$;
revoke all on function withdraw_malaffi_consent(boolean) from public, anon;
grant execute on function withdraw_malaffi_consent(boolean) to authenticated;
