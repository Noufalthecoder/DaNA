-- 031: programme outcome metrics for the DoH admin dashboard. Run after 030. Safe to re-run.
-- Totals only: no names, no ids. Any group smaller than 5 people is returned as null (shown "fewer than 5").
--   understanding   first quiz attempt per person and result type: people, all-correct %, average score %
--   most missed     the statements answered wrong most often
--   counselling     couples whose case is tier 1-2 (same gene, or pregnant) and how many booked a counsellor
--   time to booking median days from the couple's first result to their first counselling request
--   by language     understanding and uptake for each preferred language (en / ar / ur)
--   privacy         consents given, consents withdrawn, case views logged, blocks

create or replace function admin_metrics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k constant int := 5;
  out jsonb;
begin
  if my_role() not in ('admin', 'doh_viewer') then raise exception 'Not allowed'; end if;

  with first_try as (
    select distinct on (person_id, context) person_id, context, score, total, answers, created_at
    from comprehension_checks order by person_id, context, created_at
  ),
  lang as (
    select p.id as person_id, coalesce(d.preferred_language, 'en') as lang
    from people p left join person_details d on d.person_id = p.id
  ),
  cases as (   -- one per couple, kept up to date by upsert_case (triage tier 1-4)
    select couple_id, triage_tier, created_at from clinical_cases where couple_id is not null
  ),
  booked as (   -- first counselling request or appointment that was not cancelled
    select couple_id, min(at) as at from (
      select couple_id, created_at as at from consultation_requests where status <> 'CANCELLED'
      union all
      select couple_id, coalesce(confirmed_at, starts_at) from appointments where status <> 'cancelled'
    ) x group by couple_id
  ),
  at_risk as (
    select k.couple_id, k.created_at as result_at, b.at as booked_at,
           (select l.lang from couples c join lang l on l.person_id = c.partner_a where c.id = k.couple_id) as lang
    from cases k left join booked b using (couple_id)
    where k.triage_tier <= 2
  ),
  missed as (
    select a->>'id' as id, count(*) filter (where not (a->>'correct')::boolean) as wrong, count(*) as asked
    from first_try, jsonb_array_elements(answers) a group by 1
  ),
  by_lang as (
    select l.lang,
           count(distinct t.person_id) as people,
           round(100.0 * avg((t.score = t.total)::int), 0) as all_correct,
           round(100.0 * avg(t.score::numeric / t.total), 0) as avg_score
    from first_try t join lang l using (person_id) group by l.lang
  ),
  uptake_lang as (
    select lang, count(*) as at_risk, count(booked_at) as booked from at_risk group by lang
  )
  select jsonb_build_object(
    'generated_at', now(),
    'understanding', (select jsonb_build_object(
        'people', count(distinct person_id),
        'attempts', count(*),
        'all_correct_pct', case when count(*) >= k then round(100.0 * avg((score = total)::int), 0) end,
        'avg_score_pct', case when count(*) >= k then round(100.0 * avg(score::numeric / total), 0) end)
      from first_try),
    'by_context', coalesce((select jsonb_agg(jsonb_build_object('context', context, 'people', n,
        'all_correct_pct', case when n >= k then pct end) order by context)
      from (select context, count(*) n, round(100.0 * avg((score = total)::int), 0) pct from first_try group by context) x), '[]'),
    'most_missed', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'wrong', wrong, 'asked', asked,
        'wrong_pct', round(100.0 * wrong / asked, 0)) order by wrong desc, id)
      from (select * from missed where asked >= k and wrong > 0 order by wrong desc limit 5) m), '[]'),
    'counselling', (select jsonb_build_object(
        'couples_screened', (select count(*) from cases),
        'needs_counselling', count(*),
        'booked', count(booked_at),
        'uptake_pct', case when count(*) >= k then round(100.0 * count(booked_at) / nullif(count(*), 0), 0) end,
        'median_days_to_booking', case when count(booked_at) >= k then round((percentile_cont(0.5) within group
            (order by greatest(0, extract(epoch from (booked_at - result_at)) / 86400.0)))::numeric, 1) end,
        'within_7_days', count(*) filter (where booked_at - result_at <= interval '7 days'))
      from at_risk),
    'referrals', (select jsonb_build_object('sent', count(*), 'completed', count(*) filter (where status = 'completed')) from referrals),
    'by_language', coalesce((select jsonb_agg(jsonb_build_object(
        'lang', g.lang,
        'people', case when coalesce(b.people, 0) >= k then b.people end,
        'all_correct_pct', case when coalesce(b.people, 0) >= k then b.all_correct end,
        'avg_score_pct', case when coalesce(b.people, 0) >= k then b.avg_score end,
        'at_risk', case when coalesce(u.at_risk, 0) >= k then u.at_risk end,
        'uptake_pct', case when coalesce(u.at_risk, 0) >= k then round(100.0 * u.booked / u.at_risk, 0) end)
        order by array_position(array['en','ar','ur'], g.lang))
      from (values ('en'), ('ar'), ('ur')) g(lang)
      left join by_lang b on b.lang = g.lang left join uptake_lang u on u.lang = g.lang), '[]'),
    'privacy', jsonb_build_object(
        'consents_given', (select count(*) from consents where kind = 'malaffi_access' and granted),
        'consents_withdrawn', (select count(*) from consents where kind = 'malaffi_access' and not granted and revoked_at is not null),
        'case_views_logged', (select count(*) from audit_log where action = 'Viewed the case and lab reports'),
        'blocks', (select count(*) from person_blocks),
        'k_threshold', k)
  ) into out;
  return out;
end $$;
revoke all on function admin_metrics() from public, anon;
grant execute on function admin_metrics() to authenticated;
