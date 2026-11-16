-- DEMO ONLY: 10 synthetic people (5 couples) with quiz answers, couple cases and bookings,
-- so the Outcome metrics page has enough data to show (groups under 5 are hidden).
-- No logins are created. Every row id starts with 'demo_m'. Remove with demo_metrics_remove.sql.
-- Run after 031. Safe to re-run.

insert into people (id, name, short_name, sex, birth_year, language) values
  ('demo_m1a', 'Demo Person 1', 'Demo 1', 'M', 1996, 'en'), ('demo_m1b', 'Demo Person 2', 'Demo 2', 'F', 1998, 'en'),
  ('demo_m2a', 'Demo Person 3', 'Demo 3', 'M', 1994, 'en'), ('demo_m2b', 'Demo Person 4', 'Demo 4', 'F', 1997, 'en'),
  ('demo_m3a', 'Demo Person 5', 'Demo 5', 'M', 1993, 'ar'), ('demo_m3b', 'Demo Person 6', 'Demo 6', 'F', 1995, 'ar'),
  ('demo_m4a', 'Demo Person 7', 'Demo 7', 'M', 1992, 'ar'), ('demo_m4b', 'Demo Person 8', 'Demo 8', 'F', 1996, 'ar'),
  ('demo_m5a', 'Demo Person 9', 'Demo 9', 'M', 1995, 'en'), ('demo_m5b', 'Demo Person 10', 'Demo 10', 'F', 1999, 'ar')
on conflict (id) do nothing;

-- preferred language: 5 English, 5 Arabic
insert into person_details (person_id, marital_status, preferred_language)
select id, 'engaged', case when id in ('demo_m1a','demo_m1b','demo_m2a','demo_m2b','demo_m5a') then 'en' else 'ar' end
from people where id like 'demo_m%'
on conflict (person_id) do nothing;

insert into couples (id, partner_a, partner_b, stage, screened_on) values
  ('demo_mc1', 'demo_m1a', 'demo_m1b', 'engaged', current_date - 30),
  ('demo_mc2', 'demo_m2a', 'demo_m2b', 'engaged', current_date - 25),
  ('demo_mc3', 'demo_m3a', 'demo_m3b', 'engaged', current_date - 20),
  ('demo_mc4', 'demo_m4a', 'demo_m4b', 'engaged', current_date - 15),
  ('demo_mc5', 'demo_m5a', 'demo_m5b', 'engaged', current_date - 10)
on conflict (id) do nothing;

-- all 5 couples share a carrier gene (tier 2: needs counselling)
insert into clinical_cases (couple_id, clinical_urgency, triage_tier, created_at)
select id, 'high', 2, screened_on::timestamptz from couples where id like 'demo_mc%'
on conflict (couple_id) do nothing;

-- 4 of 5 couples booked a counsellor, 1 to 9 days after the result
insert into appointments (couple_id, starts_at, status)
select c.id, c.screened_on::timestamptz + make_interval(days => d), 'booked'
from couples c join (values ('demo_mc1', 1), ('demo_mc2', 2), ('demo_mc3', 3), ('demo_mc4', 9)) v(cid, d) on v.cid = c.id
where not exists (select 1 from appointments a where a.couple_id = c.id);

-- quiz: everyone answers the "1 in 4" couple quiz (quarter / next / decides) once
insert into comprehension_checks (person_id, version, context, score, total, answers, created_at)
select v.pid, 'quiz-v1', 'couple:plan', (v.q::int + v.n::int + v.d::int), 3,
       jsonb_build_array(
         jsonb_build_object('id', 'quarter', 'answer', v.q, 'correct', v.q),
         jsonb_build_object('id', 'next', 'answer', not v.n, 'correct', v.n),
         jsonb_build_object('id', 'decides', 'answer', not v.d, 'correct', v.d)),
       now() - interval '5 days'
from (values
  ('demo_m1a', true, true, true), ('demo_m1b', true, true, true), ('demo_m2a', true, false, true),
  ('demo_m2b', true, true, true), ('demo_m5a', true, true, true),
  ('demo_m3a', true, false, true), ('demo_m3b', true, true, true), ('demo_m4a', false, false, true),
  ('demo_m4b', true, true, true), ('demo_m5b', true, false, true)
) v(pid, q, n, d)
where not exists (select 1 from comprehension_checks c where c.person_id = v.pid);
