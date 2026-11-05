-- =====================================================================
-- Run AFTER 014_opposite_sex.sql (SQL Editor -> New query -> Run). Safe to re-run.
-- Default benchmarks used to cross-check each partner's screening results.
--   risk_benchmarks           exactly 2 rows: M and F. One column per parameter.
--   risk_benchmark_snapshots  append-only history. A trigger writes one row on
--                             every change, so no edit can go unrecorded.
--   lab_results               one person's screening blood results (-> people)
--   risk_assessments          each cross-check of a couple, permanently tied to
--                             couples, clinical_cases, lab_results and the exact
--                             benchmark snapshots it used. Cannot be edited.
-- Edits go through update_risk_benchmark / restore_risk_benchmark (admin only,
-- reason required, version checked). Clinical values need sign-off before use.
-- No existing table is changed. compute_tier still decides a case's triage tier;
-- a disagreement with the benchmarks is flagged, never applied automatically.
-- =====================================================================
create table if not exists risk_benchmarks (
  sex                             char(1) primary key check (sex in ('M', 'F')),
  version                         int not null default 1,
  -- full blood count
  hb_min_g_dl                     numeric(4,1) not null check (hb_min_g_dl between 5 and 20),
  mcv_min_fl                      numeric(5,1) not null check (mcv_min_fl between 50 and 120),
  mch_min_pg                      numeric(4,1) not null check (mch_min_pg between 15 and 40),
  -- haemoglobin analysis (HPLC or electrophoresis)
  hba2_carrier_min_pct            numeric(4,1) not null check (hba2_carrier_min_pct between 1 and 10),
  hba2_review_above_pct           numeric(4,1) not null check (hba2_review_above_pct between 1 and 10),
  hbf_review_min_pct              numeric(4,1) not null check (hbf_review_min_pct between 0 and 30),
  -- iron: low iron can hide or mimic a carrier result
  ferritin_min_ug_l               numeric(6,1) not null check (ferritin_min_ug_l between 1 and 500),
  ferritin_inflammation_min_ug_l  numeric(6,1) not null check (ferritin_inflammation_min_ug_l between 1 and 500),
  -- G6PD activity, % of normal. Intermediate applies to women only (null for men).
  g6pd_deficient_below_pct        numeric(4,1) not null check (g6pd_deficient_below_pct between 1 and 100),
  g6pd_intermediate_below_pct     numeric(4,1) check (g6pd_intermediate_below_pct between 1 and 100),
  -- rubella immunity is tested in women only (null for men)
  rubella_igg_immune_min_iu_ml    numeric(5,1) check (rubella_igg_immune_min_iu_ml between 1 and 100),
  rhd_negative_check              boolean not null default false,
  -- only markers the API can read, or every couple would stay "incomplete"
  infection_markers               text[] not null check (infection_markers <@ array['hiv', 'hbsag', 'anti_hcv', 'syphilis']),
  genetic_panel_min_genes         int not null check (genetic_panel_min_genes > 0),
  sources                         jsonb not null default '{}',
  updated_at                      timestamptz not null default now(),
  updated_by                      uuid,
  updated_by_name                 text not null default 'Initial setup',
  update_reason                   text not null default 'Default benchmarks',
  check (hba2_review_above_pct >= hba2_carrier_min_pct),
  check (ferritin_inflammation_min_ug_l >= ferritin_min_ug_l),
  check (g6pd_intermediate_below_pct is null or g6pd_intermediate_below_pct > g6pd_deficient_below_pct)
);

create table if not exists risk_benchmark_snapshots (
  id          bigint generated always as identity primary key,
  sex         char(1) not null references risk_benchmarks (sex),
  version     int not null,
  action      text not null check (action in ('seed', 'edit', 'restore', 'direct')),
  benchmark   jsonb not null,                    -- the whole row at this version
  changes     jsonb not null default '{}',       -- { column: { from, to } }
  reason      text not null,
  actor       uuid,
  actor_name  text not null,
  created_at  timestamptz not null default now(),
  unique (sex, version)
);

-- ---------- every change bumps the version and writes a snapshot ----------
create or replace function risk_benchmark_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sex <> old.sex then raise exception 'A benchmark row cannot change sex'; end if;
  new.version := old.version + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.updated_by_name := coalesce((select display_name from accounts where user_id = auth.uid()), 'Database administrator');
  new.update_reason := coalesce(nullif(current_setting('dana.change_reason', true), ''), 'Direct database edit, no reason given');
  return new;
end $$;

create or replace function risk_benchmark_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}';
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}') into diff
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value
      and n.key not in ('version', 'updated_at', 'updated_by', 'updated_by_name', 'update_reason');
  end if;
  insert into risk_benchmark_snapshots (sex, version, action, benchmark, changes, reason, actor, actor_name)
  values (new.sex, new.version,
          case when tg_op = 'INSERT' then 'seed' else coalesce(nullif(current_setting('dana.change_action', true), ''), 'direct') end,
          to_jsonb(new), diff, new.update_reason, new.updated_by, new.updated_by_name);
  return null;
end $$;

create or replace function risk_benchmark_locked() returns trigger
language plpgsql as $$
begin
  raise exception '% is protected: % is not allowed', tg_table_name, lower(tg_op);
end $$;

drop trigger if exists risk_benchmarks_stamp on risk_benchmarks;
drop trigger if exists risk_benchmarks_snapshot on risk_benchmarks;
drop trigger if exists risk_benchmarks_no_delete on risk_benchmarks;
drop trigger if exists risk_benchmarks_no_truncate on risk_benchmarks;
drop trigger if exists risk_snapshots_immutable on risk_benchmark_snapshots;
drop trigger if exists risk_snapshots_no_truncate on risk_benchmark_snapshots;
create trigger risk_benchmarks_stamp before update on risk_benchmarks
  for each row execute function risk_benchmark_stamp();
create trigger risk_benchmarks_snapshot after insert or update on risk_benchmarks
  for each row execute function risk_benchmark_snapshot();
create trigger risk_benchmarks_no_delete before delete on risk_benchmarks
  for each row execute function risk_benchmark_locked();
create trigger risk_benchmarks_no_truncate before truncate on risk_benchmarks
  for each statement execute function risk_benchmark_locked();
create trigger risk_snapshots_immutable before update or delete on risk_benchmark_snapshots
  for each row execute function risk_benchmark_locked();
create trigger risk_snapshots_no_truncate before truncate on risk_benchmark_snapshots
  for each statement execute function risk_benchmark_locked();

-- ---------- default values. Each carries its source in `sources`. ----------
insert into risk_benchmarks (sex, hb_min_g_dl, mcv_min_fl, mch_min_pg, hba2_carrier_min_pct, hba2_review_above_pct,
  hbf_review_min_pct, ferritin_min_ug_l, ferritin_inflammation_min_ug_l, g6pd_deficient_below_pct, g6pd_intermediate_below_pct,
  rubella_igg_immune_min_iu_ml, rhd_negative_check, infection_markers, genetic_panel_min_genes, sources)
select v.sex, v.hb, 80, 27, 3.5, 4.0, 5.0, 15, 70, 30, v.g6pd_mid, v.rubella, v.rhd,
  array['hiv', 'hbsag', 'anti_hcv', 'syphilis'], 570,
  jsonb_build_object(
    'hb_min_g_dl',                    'WHO 2024 haemoglobin cutoffs: men 13.0, non-pregnant women 12.0 g/dL',
    'mcv_min_fl',                     'UAE study definition of beta-thalassaemia trait: MCV < 80 fL',
    'mch_min_pg',                     'BSH 2023 significant haemoglobinopathies guideline: MCH < 27 pg',
    'hba2_carrier_min_pct',           'BSH 2023: HbA2 >= 3.5% with MCH < 27 pg indicates beta-thalassaemia trait',
    'hba2_review_above_pct',          'BSH 2023: HbA2 > 4% with a normal MCH needs further assessment',
    'hbf_review_min_pct',             'NHS laboratory reference (Sheffield): HbF >= 5% with MCH < 27 pg, possible delta-beta. Lab-level, not a national standard',
    'ferritin_min_ug_l',              'WHO 2020 ferritin guideline: < 15 ug/L in adults. Confirm against the WHO table',
    'ferritin_inflammation_min_ug_l', 'WHO 2020 ferritin guideline: < 70 ug/L in adults with infection or inflammation',
    'g6pd_deficient_below_pct',       'WHO malaria guidelines: below 30% of normal is deficient',
    'g6pd_intermediate_below_pct',    'WHO 2024 malaria guidelines: 30-70% is intermediate in heterozygous women (2022 text used 30-80%)',
    'rubella_igg_immune_min_iu_ml',   'WHO laboratory manual and CLSI: 10 IU/mL. Assays vary, so check the lab''s own cut-off',
    'rhd_negative_check',             'NICE TA156: anti-D prophylaxis for RhD-negative pregnant women. Confirm the UAE protocol',
    'infection_markers',              'UAE premarital screening: HIV, hepatitis B, hepatitis C, syphilis',
    'genetic_panel_min_genes',        'MOHAP and DoH Abu Dhabi: 570 genes, 840+ conditions, mandatory for Emiratis since January 2025'
  )
from (values ('M', 13.0, null::numeric, null::numeric, false),
             ('F', 12.0, 70, 10, true)) as v(sex, hb, g6pd_mid, rubella, rhd)
on conflict (sex) do nothing;

-- ---------- edits: admin only, reason required, version checked ----------
create or replace function risk_benchmark_columns() returns text[]
language sql immutable as $$
  select array['hb_min_g_dl', 'mcv_min_fl', 'mch_min_pg', 'hba2_carrier_min_pct', 'hba2_review_above_pct', 'hbf_review_min_pct',
    'ferritin_min_ug_l', 'ferritin_inflammation_min_ug_l', 'g6pd_deficient_below_pct', 'g6pd_intermediate_below_pct',
    'rubella_igg_immune_min_iu_ml', 'rhd_negative_check', 'infection_markers', 'genetic_panel_min_genes', 'sources']
$$;

create or replace function apply_risk_benchmark(p_sex text, p_changes jsonb, p_reason text, p_expected_version int, p_action text)
returns risk_benchmarks
language plpgsql security definer set search_path = public as $$
declare
  cur risk_benchmarks;
  nxt risk_benchmarks;
  bad text;
begin
  if my_role() is distinct from 'admin' then
    raise sqlstate 'PT403' using message = 'Only the programme admin can change risk benchmarks';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then
    raise sqlstate 'PT422' using message = 'Give a reason of at least 10 characters';
  end if;

  select * into cur from risk_benchmarks where sex = p_sex for update;
  if not found then raise sqlstate 'PT404' using message = 'No benchmark for that sex'; end if;
  if cur.version <> p_expected_version then
    raise sqlstate 'PT409' using message = format('This benchmark is now at version %s. Reload and try again.', cur.version);
  end if;

  select k into bad from jsonb_object_keys(p_changes) k where not k = any (risk_benchmark_columns()) limit 1;
  if bad is not null then raise sqlstate 'PT422' using message = format('%s cannot be edited', bad); end if;

  nxt := jsonb_populate_record(cur, p_changes);
  if to_jsonb(nxt) = to_jsonb(cur) then raise sqlstate 'PT422' using message = 'Nothing changed'; end if;

  perform set_config('dana.change_reason', btrim(p_reason), true);
  perform set_config('dana.change_action', p_action, true);
  update risk_benchmarks set
    hb_min_g_dl = nxt.hb_min_g_dl, mcv_min_fl = nxt.mcv_min_fl, mch_min_pg = nxt.mch_min_pg,
    hba2_carrier_min_pct = nxt.hba2_carrier_min_pct, hba2_review_above_pct = nxt.hba2_review_above_pct,
    hbf_review_min_pct = nxt.hbf_review_min_pct, ferritin_min_ug_l = nxt.ferritin_min_ug_l,
    ferritin_inflammation_min_ug_l = nxt.ferritin_inflammation_min_ug_l,
    g6pd_deficient_below_pct = nxt.g6pd_deficient_below_pct, g6pd_intermediate_below_pct = nxt.g6pd_intermediate_below_pct,
    rubella_igg_immune_min_iu_ml = nxt.rubella_igg_immune_min_iu_ml, rhd_negative_check = nxt.rhd_negative_check,
    infection_markers = nxt.infection_markers, genetic_panel_min_genes = nxt.genetic_panel_min_genes, sources = nxt.sources
  where sex = p_sex
  returning * into nxt;

  insert into audit_log (actor, actor_name, action, resource_type, resource_id, metadata)
  values (auth.uid(), nxt.updated_by_name,
          format('%s the %s risk benchmark (now version %s)', case when p_action = 'restore' then 'Restored' else 'Edited' end,
                 case when p_sex = 'M' then 'male' else 'female' end, nxt.version),
          'risk_benchmarks', p_sex, jsonb_build_object('version', nxt.version, 'reason', btrim(p_reason)));
  return nxt;
end $$;

create or replace function update_risk_benchmark(p_sex text, p_changes jsonb, p_reason text, p_expected_version int)
returns risk_benchmarks
language sql security definer set search_path = public as $$
  select * from apply_risk_benchmark(p_sex, p_changes, p_reason, p_expected_version, 'edit')
$$;

-- restoring makes a new version from an old snapshot; history is never rewritten
create or replace function restore_risk_benchmark(p_sex text, p_version int, p_reason text, p_expected_version int)
returns risk_benchmarks
language plpgsql security definer set search_path = public as $$
declare
  snap jsonb;
begin
  select benchmark into snap from risk_benchmark_snapshots where sex = p_sex and version = p_version;
  if snap is null then raise sqlstate 'PT404' using message = 'No snapshot at that version'; end if;
  return apply_risk_benchmark(p_sex,
    (select jsonb_object_agg(key, value) from jsonb_each(snap) where key = any (risk_benchmark_columns())),
    p_reason, p_expected_version, 'restore');
end $$;

-- ---------- a person's screening blood results ----------
-- A correction is a new row: the latest collected_on wins and the old value stays on record.
create table if not exists lab_results (
  id            uuid primary key default gen_random_uuid(),
  person_id     text not null references people (id),
  collected_on  date not null,
  source        text not null default 'manual' check (source in ('manual', 'lab', 'malaffi')),
  lab_name      text,
  report_ref    text,
  hb            numeric(4,1) check (hb > 0 and hb <= 30),            -- g/dL
  mcv           numeric(5,1) check (mcv > 0 and mcv <= 200),         -- fL
  mch           numeric(4,1) check (mch > 0 and mch <= 60),          -- pg
  hba2          numeric(4,1) check (hba2 between 0 and 100),         -- %
  hbf           numeric(4,1) check (hbf between 0 and 100),          -- %
  hb_variant    text check (hb_variant in ('none', 'HbS', 'HbC', 'HbD', 'HbE', 'other')),
  ferritin      numeric(7,1) check (ferritin between 0 and 20000),   -- ug/L
  inflammation  boolean not null default false,
  g6pd_pct      numeric(5,1) check (g6pd_pct between 0 and 300),     -- % of normal
  rubella_igg   numeric(6,1) check (rubella_igg between 0 and 1000), -- IU/mL
  rhd           text check (rhd in ('positive', 'negative')),
  hiv           text check (hiv in ('non_reactive', 'reactive')),
  hbsag         text check (hbsag in ('non_reactive', 'reactive')),
  anti_hcv      text check (anti_hcv in ('non_reactive', 'reactive')),
  syphilis      text check (syphilis in ('non_reactive', 'reactive')),
  panel_genes   int check (panel_genes > 0),
  entered_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists lab_results_person on lab_results (person_id, collected_on desc, created_at desc);

-- ---------- each cross-check of a couple ----------
create table if not exists risk_assessments (
  id                        uuid primary key default gen_random_uuid(),
  couple_id                 text not null references couples (id),
  case_id                   uuid references clinical_cases (id),     -- filled in by the database
  male_person               text not null references people (id),    -- filled in by the database
  female_person             text not null references people (id),    -- filled in by the database
  male_lab_id               uuid references lab_results (id),
  female_lab_id             uuid references lab_results (id),
  male_sex                  char(1) not null default 'M' check (male_sex = 'M'),
  female_sex                char(1) not null default 'F' check (female_sex = 'F'),
  male_benchmark_version    int not null,
  female_benchmark_version  int not null,
  rules_version             text not null,
  benchmark_tier            int check (benchmark_tier between 1 and 4),  -- null = results incomplete
  engine_tier               int not null check (engine_tier between 1 and 4),  -- compute_tier, filled in by the database
  tier_mismatch             boolean generated always as (benchmark_tier is not null and benchmark_tier <> engine_tier) stored,
  complete                  boolean not null,
  pregnant_weeks            int,                                       -- filled in by the database
  consanguineous            boolean,
  findings                  jsonb not null default '[]',
  actions                   jsonb not null default '[]',
  missing                   jsonb not null default '{}',
  created_by                uuid not null,
  created_by_name           text not null default 'Unknown',
  created_at                timestamptz not null default now(),
  -- the exact benchmark rows this result was measured against
  foreign key (male_sex, male_benchmark_version) references risk_benchmark_snapshots (sex, version),
  foreign key (female_sex, female_benchmark_version) references risk_benchmark_snapshots (sex, version)
);
create index if not exists risk_assessments_couple on risk_assessments (couple_id, created_at desc);
create index if not exists risk_assessments_mismatch on risk_assessments (created_at desc) where tier_mismatch;

-- the database decides who the partners are and what the engine says, so neither can be forged
create or replace function risk_assessment_link() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c couples;
  sex_a char(1);
  sex_b char(1);
begin
  select * into c from couples where id = new.couple_id;
  if not found then raise exception 'No such couple'; end if;
  select sex into sex_a from people where id = c.partner_a;
  select sex into sex_b from people where id = c.partner_b;
  if sex_a = sex_b then raise exception 'Benchmarks compare one male and one female partner'; end if;

  new.male_person   := case when sex_a = 'M' then c.partner_a else c.partner_b end;
  new.female_person := case when sex_a = 'F' then c.partner_a else c.partner_b end;
  if new.male_lab_id is not null and not exists (select 1 from lab_results where id = new.male_lab_id and person_id = new.male_person) then
    raise exception 'male_lab_id does not belong to the male partner';
  end if;
  if new.female_lab_id is not null and not exists (select 1 from lab_results where id = new.female_lab_id and person_id = new.female_person) then
    raise exception 'female_lab_id does not belong to the female partner';
  end if;

  new.case_id := (select id from clinical_cases where couple_id = new.couple_id);
  new.engine_tier := compute_tier(new.couple_id);
  new.pregnant_weeks := c.pregnant_weeks;
  new.created_by_name := coalesce((select display_name from accounts where user_id = new.created_by), 'Unknown');
  return new;
end $$;

drop trigger if exists risk_assessments_link on risk_assessments;
drop trigger if exists risk_assessments_immutable on risk_assessments;
drop trigger if exists risk_assessments_no_truncate on risk_assessments;
create trigger risk_assessments_link before insert on risk_assessments
  for each row execute function risk_assessment_link();
create trigger risk_assessments_immutable before update or delete on risk_assessments
  for each row execute function risk_benchmark_locked();
create trigger risk_assessments_no_truncate before truncate on risk_assessments
  for each statement execute function risk_benchmark_locked();

-- ---------- who can see what ----------
alter table risk_benchmarks          enable row level security;
alter table risk_benchmark_snapshots enable row level security;
alter table lab_results              enable row level security;
alter table risk_assessments         enable row level security;

drop policy if exists benchmarks_read on risk_benchmarks;
drop policy if exists benchmark_snapshots_read on risk_benchmark_snapshots;
create policy benchmarks_read on risk_benchmarks for select to authenticated using (true);
create policy benchmark_snapshots_read on risk_benchmark_snapshots for select to authenticated
  using (my_role() in ('admin', 'counsellor'));

-- lab results hold infection markers, so they follow medical_records: never the partner
drop policy if exists lab_results_read on lab_results;
drop policy if exists lab_results_add on lab_results;
create policy lab_results_read on lab_results for select to authenticated
  using (person_id = my_person() or (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor')));
create policy lab_results_add on lab_results for insert to authenticated
  with check (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor') and entered_by = auth.uid());

-- an assessment shows both partners' findings, so it stays with the counsellor. Written by the API only.
drop policy if exists risk_assessments_read on risk_assessments;
create policy risk_assessments_read on risk_assessments for select to authenticated
  using (my_role() = 'counsellor' and has_consent(male_person, 'share_counsellor') and has_consent(female_person, 'share_counsellor'));

revoke insert, update, delete, truncate on risk_benchmarks, risk_benchmark_snapshots, risk_assessments from anon, authenticated;
revoke update, delete, truncate on lab_results from anon, authenticated;
revoke insert on lab_results from anon;
revoke all on function apply_risk_benchmark(text, jsonb, text, int, text) from public, anon, authenticated;
revoke all on function update_risk_benchmark(text, jsonb, text, int) from public, anon;
revoke all on function restore_risk_benchmark(text, int, text, int) from public, anon;
grant execute on function update_risk_benchmark(text, jsonb, text, int), restore_risk_benchmark(text, int, text, int) to authenticated;

-- check: 2 rows, both at version 1 on a first run
select sex, version, hb_min_g_dl, g6pd_intermediate_below_pct, rubella_igg_immune_min_iu_ml from risk_benchmarks order by sex;
