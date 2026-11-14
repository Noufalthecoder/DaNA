-- 028: comprehension check answers, for the person and for programme metrics. Run after 027. Safe to re-run.
create table if not exists comprehension_checks (
  id          bigint generated always as identity primary key,
  person_id   text not null references people (id),
  version     text not null,
  context     text not null,           -- e.g. 'couple:plan', 'individual:carrier'
  score       int  not null check (score >= 0),
  total       int  not null check (total > 0 and score <= total),
  answers     jsonb not null default '[]',
  created_at  timestamptz not null default now()
);
create index if not exists comprehension_person on comprehension_checks (person_id, created_at desc);
alter table comprehension_checks enable row level security;
drop policy if exists comprehension_read on comprehension_checks;
create policy comprehension_read on comprehension_checks for select to authenticated
  using (person_id = my_person() or my_role() = 'admin');
revoke insert, update, delete on comprehension_checks from anon, authenticated;

create or replace function save_comprehension(p_version text, p_context text, p_score int, p_total int, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare me text := my_person();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if p_total not between 1 and 10 or p_score not between 0 and p_total then raise exception 'Invalid score'; end if;
  insert into comprehension_checks (person_id, version, context, score, total, answers)
  values (me, left(p_version, 20), left(p_context, 40), p_score, p_total, coalesce(p_answers, '[]'));
end $$;
revoke all on function save_comprehension(text, text, int, int, jsonb) from public, anon;
grant execute on function save_comprehension(text, text, int, int, jsonb) to authenticated;

-- anonymous totals for the programme (no names): each person's first attempt per result type
create or replace function comprehension_stats() returns table (context text, people bigint, all_correct_pct numeric, avg_score_pct numeric)
language sql stable security definer set search_path = public as $$
  select f.context, count(*), round(100.0 * avg((f.score = f.total)::int), 1), round(100.0 * avg(f.score::numeric / f.total), 1)
  from (select distinct on (person_id, context) * from comprehension_checks order by person_id, context, created_at) f
  where my_role() = 'admin'
  group by f.context order by f.context
$$;
revoke all on function comprehension_stats() from public, anon;
grant execute on function comprehension_stats() to authenticated;
