-- =====================================================================
-- DaNA schema v3 (Clinically Governed Baseline)
-- Run AFTER 001 schema.sql, seed.sql, 002_signup.sql and 003_sample_journey.sql.
-- SQL Editor -> New query -> paste -> Run. Additive: nothing existing is dropped.
--
-- Spec name -> table here
--   users              -> accounts (+ auth.users)
--   patient_profiles   -> people (+ date_of_birth, phone_number_hash)
--   consent_records    -> consents (+ scope, version, revoked_at, ip_address, user_agent)
--   audit_logs         -> audit_log (+ resource_type, resource_id, metadata)
--   appointments       -> appointments (+ case_id, counsellor_id, meeting_type)
--   counselling_notes  -> notes (+ appointment_id, ai_draft_note, clinical_summary, approved_by, approved_at)
--   all other spec tables are created below with the spec's names.
-- Synthetic data only.
-- =====================================================================

-- ---------- extend existing tables ----------
alter table people     add column if not exists date_of_birth date;
alter table people     add column if not exists phone_number_hash text;          -- sha256 only, never the number

alter table consents   add column if not exists scope text not null default 'default';
alter table consents   add column if not exists version text not null default 'v1';
alter table consents   add column if not exists revoked_at timestamptz;
alter table consents   add column if not exists ip_address text;
alter table consents   add column if not exists user_agent text;

alter table audit_log  add column if not exists resource_type text;
alter table audit_log  add column if not exists resource_id text;
alter table audit_log  add column if not exists metadata jsonb;

-- ---------- genetic reports and variants (from Malaffi, validated) ----------
create table if not exists genetic_reports (
  id                 uuid primary key default gen_random_uuid(),
  person_id          text not null references people (id),
  report_id          text not null unique,                        -- the lab's own report number
  source             text not null default 'Malaffi (simulated)',
  laboratory_name    text not null,
  accreditation_id   text,                                         -- e.g. CAP / ISO 15189 number
  test_methodology   text not null default 'Targeted NGS panel',
  panel_coverage     text not null default '570 genes (Abu Dhabi premarital panel)',
  genes_screened     int  not null default 570,
  limitations        text not null default 'A negative result lowers, but does not remove, the chance of carrying a variant.',
  report_date        date not null,
  validation_status  text not null default 'pending' check (validation_status in ('pending', 'verified', 'failed')),
  digital_signature  text,
  file_storage_path  text,                                         -- encrypted vault path (pilot)
  created_at         timestamptz not null default now()
);

create table if not exists genetic_variants (
  id                     uuid primary key default gen_random_uuid(),
  report_id              uuid not null references genetic_reports (id) on delete cascade,
  gene_symbol            text not null references genes (symbol),
  ncbi_gene_id           text,
  transcript_id          text,
  hgvs_c                 text,
  hgvs_p                 text,
  genome_build           text not null default 'GRCh38',
  zygosity               text not null check (zygosity in ('heterozygous', 'homozygous', 'hemizygous')),
  inheritance_pattern    text not null check (inheritance_pattern in ('AR', 'XL', 'AD')),
  clinical_significance  text not null check (clinical_significance in ('pathogenic', 'likely_pathogenic', 'vus', 'likely_benign', 'benign')),
  significance_source    text not null default 'ClinVar',
  review_status          text,
  disease_association    text,
  created_at             timestamptz not null default now()
);

create table if not exists medical_records (
  id                  uuid primary key default gen_random_uuid(),
  person_id           text not null references people (id),
  source              text not null default 'Malaffi (simulated)',
  resource_type       text not null,                              -- FHIR type, e.g. DiagnosticReport
  external_reference  text,
  terminology_system  text,                                       -- LOINC / SNOMED CT
  clinical_code       text,
  display_name        text,
  status              text not null default 'final',
  recorded_date       date,
  raw_payload         jsonb
);

-- ---------- partner sharing with scope and expiry ----------
create table if not exists partner_consents (
  id            uuid primary key default gen_random_uuid(),
  couple_id     text not null references couples (id),
  owner_id      text not null references people (id),
  recipient_id  text not null references people (id),
  scope         text not null check (scope in ('result_summary', 'full_report', 'plan')),
  status        text not null default 'active' check (status in ('active', 'revoked')),
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz,                                       -- null = until revoked
  revoked_at    timestamptz,
  unique (couple_id, owner_id, scope)
);

-- ---------- family tree (qualitative; no risk coefficients) ----------
create table if not exists family_members (
  id               uuid primary key default gen_random_uuid(),
  owner_id         text not null references people (id),
  display_name     text not null,                                  -- a label the owner chooses, e.g. "My brother"
  relationship     text not null,
  gender           text check (gender in ('M', 'F')),
  parent_ids       uuid[],
  is_deceased      boolean not null default false,
  evidence_status  text not null default 'reported' check (evidence_status in ('reported', 'tested', 'unknown')),
  created_at       timestamptz not null default now()
);

create table if not exists family_conditions (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references family_members (id) on delete cascade,
  condition_name       text not null,
  age_at_onset         int,
  source               text not null default 'self-reported',
  verification_status  text not null default 'unverified' check (verification_status in ('unverified', 'verified'))
);

-- ---------- clinical cases and triage ----------
create table if not exists clinical_cases (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          text unique references couples (id),
  patient_id         text references people (id),
  case_type          text not null default 'couple' check (case_type in ('couple', 'individual')),
  workflow_status    text not null default 'new' check (workflow_status in ('new', 'in_review', 'counselled', 'closed')),
  clinical_urgency   text not null,
  is_pregnant        boolean not null default false,
  gestational_weeks  int,
  triage_tier        int not null check (triage_tier between 1 and 4),
  case_status        text not null default 'open' check (case_status in ('open', 'closed')),
  rule_version_id    text not null default 'rules-v0.2',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists counsellors (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique references auth.users (id),
  name                  text not null,
  gender                text check (gender in ('M', 'F')),
  languages             text[] not null default array['ar', 'en'],
  specialties           text[] not null default array['premarital'],
  employment_type       text not null default 'full_time',
  location              text,
  max_caseload          int not null default 40,
  active_caseload       int not null default 0,
  credentials_verified  boolean not null default false,
  status                text not null default 'active' check (status in ('active', 'away', 'inactive'))
);

create table if not exists counsellor_availability (
  id                   uuid primary key default gen_random_uuid(),
  counsellor_id        uuid not null references counsellors (id) on delete cascade,
  slot_start           timestamptz not null,
  slot_end             timestamptz not null,
  is_booked            boolean not null default false,
  is_emergency_buffer  boolean not null default false,              -- kept free for Tier 1 cases
  unique (counsellor_id, slot_start)
);

create table if not exists case_assignments (
  id                 uuid primary key default gen_random_uuid(),
  case_id            uuid not null references clinical_cases (id) on delete cascade,
  counsellor_id      uuid not null references counsellors (id),
  assigned_by        uuid references auth.users (id),
  assignment_reason  text not null default 'auto: language and caseload',
  assigned_at        timestamptz not null default now(),
  status             text not null default 'active' check (status in ('active', 'ended')),
  unique (case_id, counsellor_id)
);

alter table appointments add column if not exists case_id uuid references clinical_cases (id);
alter table appointments add column if not exists counsellor_id uuid references counsellors (id);
alter table appointments add column if not exists meeting_type text not null default 'video';

alter table notes add column if not exists appointment_id bigint references appointments (id);
alter table notes add column if not exists ai_draft_note text;           -- AI may draft; a human must approve
alter table notes add column if not exists clinical_summary text;
alter table notes add column if not exists approved_by uuid references auth.users (id);
alter table notes add column if not exists approved_at timestamptz;

create table if not exists referrals (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references clinical_cases (id) on delete cascade,
  destination  text not null check (destination in ('IVF / PGT-M', 'Fetal medicine', 'Haematology', 'Paediatrics', 'Other')),
  priority     text not null default 'routine' check (priority in ('urgent', 'high', 'routine')),
  reason       text not null,
  status       text not null default 'sent' check (status in ('draft', 'sent', 'accepted', 'completed')),
  created_at   timestamptz not null default now()
);

-- ---------- Sila invitations: a hashed token, 14-day expiry, no contact details ----------
create table if not exists sila_invitations (
  id          uuid primary key default gen_random_uuid(),
  sender_id   text not null references people (id),
  relationship text,
  token_hash  text not null unique,                                -- sha256 of the token; the token itself is never stored
  status      text not null default 'sent' check (status in ('sent', 'opened', 'booked', 'expired')),
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Rules: who may see a person's genetic data
-- =====================================================================
create or replace function can_see_genetics(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select p = my_person()
      or (p = my_partner() and (
            has_consent(p, 'share_partner')
            or exists (select 1 from partner_consents pc
                       where pc.owner_id = p and pc.recipient_id = my_person() and pc.status = 'active'
                         and (pc.expires_at is null or pc.expires_at > now()))))
      or (my_role() = 'counsellor' and has_consent(p, 'share_counsellor'))
$$;

-- =====================================================================
-- Triage engine (deterministic, versioned). No AI.
--   Tier 1 urgent  : pregnant + shared pathogenic finding (or X-linked)
--   Tier 2 high    : shared AR pathogenic finding, or X-linked female carrier
--   Tier 3 moderate: VUS / uncertain, or a single carrier
--   Tier 4 routine : nothing relevant found
-- =====================================================================
create or replace function compute_tier(cid text) returns int
language sql stable security definer set search_path = public as $$
  with c as (select * from couples where id = cid),
  v as (
    select r.person_id, gv.gene_symbol, gv.clinical_significance, gv.inheritance_pattern, p.sex
    from genetic_reports r
    join genetic_variants gv on gv.report_id = r.id
    join people p on p.id = r.person_id
    where r.person_id in (select partner_a from c union select partner_b from c)
  ),
  path as (select * from v where clinical_significance in ('pathogenic', 'likely_pathogenic')),
  matched as (
    select 1 from path a join path b on a.gene_symbol = b.gene_symbol and a.person_id <> b.person_id
    where a.inheritance_pattern = 'AR'
    union all
    select 1 from path where inheritance_pattern = 'XL' and sex = 'F'
  )
  select case
    when exists (select 1 from matched) and (select pregnant_weeks from c) is not null then 1
    when exists (select 1 from matched) then 2
    when exists (select 1 from v where clinical_significance = 'vus') or exists (select 1 from path) then 3
    else 4
  end
$$;

create or replace function upsert_case(cid text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t int := compute_tier(cid); w int; v_case uuid;
begin
  select pregnant_weeks into w from couples where id = cid;
  insert into clinical_cases (couple_id, clinical_urgency, is_pregnant, gestational_weeks, triage_tier)
  values (cid, (array['urgent', 'high', 'moderate', 'routine'])[t], w is not null, w, t)
  on conflict (couple_id) do update
    set triage_tier = excluded.triage_tier, clinical_urgency = excluded.clinical_urgency,
        is_pregnant = excluded.is_pregnant, gestational_weeks = excluded.gestational_weeks, updated_at = now()
  returning id into v_case;
  -- assign to the active counsellor with the most free capacity
  insert into case_assignments (case_id, counsellor_id)
  select v_case, k.id from counsellors k
  where k.status = 'active'
    and not exists (select 1 from case_assignments a where a.case_id = v_case and a.status = 'active')
  order by (k.max_caseload - k.active_caseload) desc limit 1;
  return v_case;
end $$;

-- staff (or the SQL editor) can recompute every case
create or replace function sync_cases() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; c record;
begin
  if auth.uid() is not null and coalesce(my_role(), '') not in ('counsellor', 'admin') then
    raise exception 'Only staff can recompute cases';
  end if;
  for c in select id from couples loop perform upsert_case(c.id); n := n + 1; end loop;
  update counsellors k set active_caseload = (select count(*) from case_assignments a where a.counsellor_id = k.id and a.status = 'active') where true;
  return n;
end $$;

-- =====================================================================
-- Sila invitations: create (sender) and open (relative, no login)
-- =====================================================================
create or replace function create_sila_invitation(rel text) returns text
language plpgsql security definer set search_path = public as $$
declare token text := replace(gen_random_uuid()::text, '-', '');
begin
  if my_person() is null then raise exception 'Only a couple member can send an invitation'; end if;
  insert into sila_invitations (sender_id, relationship, token_hash)
  values (my_person(), rel, encode(sha256(convert_to(token, 'UTF8')), 'hex'));
  insert into sila_alerts (sender, relationship) values (my_person(), rel);   -- keeps v1 screens counting
  return token;                                                                  -- shown once, in the SMS link
end $$;

-- the relative's page calls this with the token from the link; reveals no names or results
create or replace function open_sila_invitation(token text) returns text
language plpgsql security definer set search_path = public as $$
declare inv sila_invitations;
begin
  select * into inv from sila_invitations where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if not found then return 'invalid'; end if;
  if inv.expires_at < now() then
    update sila_invitations set status = 'expired' where id = inv.id;
    return 'expired';
  end if;
  if inv.status = 'sent' then update sila_invitations set status = 'opened' where id = inv.id; end if;
  return 'valid';
end $$;

create or replace function book_from_sila_invitation(token text) returns text
language plpgsql security definer set search_path = public as $$
begin
  update sila_invitations set status = 'booked'
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex') and expires_at > now();
  return case when found then 'booked' else 'invalid' end;
end $$;

-- =====================================================================
-- DoH analytics with small-cell suppression (k-anonymity, n < 5 hidden)
-- =====================================================================
create or replace function programme_breakdown()
returns table (condition text, couples bigint, suppressed boolean)
language sql stable security definer set search_path = public as $$
  with per as (
    select g.condition, count(distinct cc.couple_id) as n
    from clinical_cases cc
    join couples c on c.id = cc.couple_id
    join genetic_reports r on r.person_id in (c.partner_a, c.partner_b)
    join genetic_variants gv on gv.report_id = r.id
    join genes g on g.symbol = gv.gene_symbol
    where cc.triage_tier <= 3
    group by g.condition
  )
  select condition, case when n < 5 then null else n end, n < 5
  from per
  where my_role() = 'admin'
  order by n desc
$$;

create or replace function programme_tiers()
returns table (triage_tier int, couples bigint, suppressed boolean)
language sql stable security definer set search_path = public as $$
  select t.tier, case when count(cc.id) < 5 then null else count(cc.id) end, count(cc.id) < 5
  from generate_series(1, 4) as t(tier)
  left join clinical_cases cc on cc.triage_tier = t.tier
  where my_role() = 'admin'
  group by t.tier order by t.tier
$$;

-- =====================================================================
-- Row-level security for the new tables
-- =====================================================================
alter table genetic_reports          enable row level security;
alter table genetic_variants         enable row level security;
alter table medical_records          enable row level security;
alter table partner_consents         enable row level security;
alter table family_members           enable row level security;
alter table family_conditions        enable row level security;
alter table clinical_cases           enable row level security;
alter table counsellors              enable row level security;
alter table counsellor_availability  enable row level security;
alter table case_assignments         enable row level security;
alter table referrals                enable row level security;
alter table sila_invitations         enable row level security;

do $$ begin
  -- policies are created only if missing, so this file is safe to re-run
  if not exists (select 1 from pg_policies where policyname = 'reports_read') then
    create policy reports_read on genetic_reports for select to authenticated using (can_see_genetics(person_id));
    create policy variants_read on genetic_variants for select to authenticated
      using (exists (select 1 from genetic_reports r where r.id = genetic_variants.report_id and can_see_genetics(r.person_id)));
    -- medical records: owner and counsellor (with consent) only, never the partner
    create policy medrec_read on medical_records for select to authenticated
      using (person_id = my_person() or (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor')));

    create policy pconsent_read on partner_consents for select to authenticated
      using (owner_id = my_person() or recipient_id = my_person());
    create policy pconsent_grant on partner_consents for insert to authenticated
      with check (owner_id = my_person() and couple_id = my_couple());
    create policy pconsent_change on partner_consents for update to authenticated using (owner_id = my_person());

    create policy family_read on family_members for select to authenticated
      using (owner_id = my_person() or my_role() = 'counsellor');
    create policy family_write on family_members for insert to authenticated with check (owner_id = my_person());
    create policy family_change on family_members for update to authenticated using (owner_id = my_person());
    create policy family_remove on family_members for delete to authenticated using (owner_id = my_person());
    create policy fcond_read on family_conditions for select to authenticated
      using (exists (select 1 from family_members m where m.id = family_conditions.member_id and (m.owner_id = my_person() or my_role() = 'counsellor')));
    create policy fcond_write on family_conditions for insert to authenticated
      with check (exists (select 1 from family_members m where m.id = family_conditions.member_id and m.owner_id = my_person()));

    create policy cases_read on clinical_cases for select to authenticated
      using (couple_id = my_couple() or patient_id = my_person() or my_role() = 'counsellor');
    create policy cases_update on clinical_cases for update to authenticated using (my_role() = 'counsellor');

    create policy counsellors_read on counsellors for select to authenticated using (true);
    create policy counsellors_manage on counsellors for update to authenticated using (my_role() = 'admin' or user_id = auth.uid());

    create policy avail_read on counsellor_availability for select to authenticated using (true);
    create policy avail_manage on counsellor_availability for update to authenticated
      using (exists (select 1 from counsellors k where k.id = counsellor_availability.counsellor_id and (k.user_id = auth.uid() or my_couple() is not null)));

    create policy assign_read on case_assignments for select to authenticated
      using (my_role() in ('counsellor', 'admin')
             or exists (select 1 from clinical_cases cc where cc.id = case_assignments.case_id and cc.couple_id = my_couple()));
    create policy assign_manage on case_assignments for insert to authenticated with check (my_role() in ('counsellor', 'admin'));

    create policy referrals_read on referrals for select to authenticated
      using (my_role() = 'counsellor' or exists (select 1 from clinical_cases cc where cc.id = referrals.case_id and cc.couple_id = my_couple()));
    create policy referrals_write on referrals for insert to authenticated with check (my_role() = 'counsellor');
    create policy referrals_change on referrals for update to authenticated using (my_role() = 'counsellor');

    create policy sila_inv_read on sila_invitations for select to authenticated using (sender_id = my_person());
  end if;
  -- note approval: a counsellor may edit and approve her own unapproved notes; once approved a note is locked
  if not exists (select 1 from pg_policies where policyname = 'notes_approve') then
    create policy notes_approve on notes for update to authenticated
      using (my_role() = 'counsellor' and author = auth.uid() and approved_at is null)
      with check (my_role() = 'counsellor' and author = auth.uid());
  end if;
end $$;

grant execute on function can_see_genetics(text), compute_tier(text), sync_cases(),
  create_sila_invitation(text), programme_breakdown(), programme_tiers() to authenticated;
-- the relative is not logged in
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function open_sila_invitation(text), book_from_sila_invitation(text) to anon, authenticated';
  end if;
end $$;
revoke execute on function upsert_case(text) from public;

-- =====================================================================
-- New users: the sample journey now also creates a validated report and a case
-- =====================================================================
create or replace function start_sample_journey() returns text
language plpgsql security definer set search_path = public as $$
declare
  acc      accounts;
  tag      text := left(replace(auth.uid()::text, '-', ''), 12);
  me       text := 'u_' || tag;
  partner  text := 'p_' || tag;
  cid      text := 'k_' || tag;
  rid      uuid;
  who      text;
begin
  select * into acc from accounts where user_id = auth.uid();
  if not found then raise exception 'No account for this login'; end if;
  if acc.person_id is not null then return acc.person_id; end if;
  if acc.role <> 'couple' then return null; end if;

  insert into people (id, name, short_name, sex) values
    (me, acc.display_name, split_part(acc.display_name, ' ', 1), 'M'),
    (partner, 'Sample partner', 'Your partner', 'F')
  on conflict (id) do nothing;
  insert into results (person_id, gene, reported_on, malaffi_ref) values
    (me, 'HBB', current_date, 'sample'), (partner, 'HBB', current_date, 'sample')
  on conflict (person_id) do nothing;
  insert into couples (id, partner_a, partner_b, stage, screened_on)
  values (cid, me, partner, 'engaged', current_date) on conflict (id) do nothing;
  insert into consents (person_id, kind, granted)
  select p, kd, true from unnest(array[me, partner]) p
  cross join unnest(array['share_partner', 'share_counsellor', 'faith_cards']) kd
  on conflict (person_id, kind) do nothing;

  foreach who in array array[me, partner] loop
    insert into genetic_reports (person_id, report_id, laboratory_name, accreditation_id, report_date, validation_status, digital_signature)
    values (who, 'SAMPLE-' || who, 'Abu Dhabi Genomics Lab (simulated)', 'CAP-0000000', current_date, 'verified', 'sha256:sample')
    on conflict (report_id) do nothing returning id into rid;
    if rid is not null then
      insert into genetic_variants (report_id, gene_symbol, ncbi_gene_id, transcript_id, hgvs_c, hgvs_p, zygosity, inheritance_pattern, clinical_significance, review_status, disease_association)
      values (rid, 'HBB', '3043', 'NM_000518.5', 'c.20A>T', 'p.Glu7Val', 'heterozygous', 'AR', 'pathogenic', 'reviewed by expert panel', 'Beta-thalassaemia');
    end if;
  end loop;

  update accounts set person_id = me, title = 'Partner · engaged (sample journey)' where user_id = auth.uid();
  perform upsert_case(cid);
  return me;
end $$;
grant execute on function start_sample_journey() to authenticated;

-- =====================================================================
-- Demo data for the new tables
-- =====================================================================
insert into counsellors (user_id, name, gender, languages, specialties, location, credentials_verified)
select (select id from auth.users where email = 'mariam@dana.demo'), 'Dr. Mariam Al Hosani', 'F',
       array['ar', 'en'], array['premarital', 'prenatal', 'haemoglobinopathies'], 'Abu Dhabi', true
where not exists (select 1 from counsellors where name = 'Dr. Mariam Al Hosani');
insert into counsellors (name, gender, languages, specialties, location, credentials_verified)
select 'Dr. Yousef Al Marzooqi', 'M', array['ar', 'en'], array['premarital', 'X-linked conditions'], 'Al Ain', true
where not exists (select 1 from counsellors where name = 'Dr. Yousef Al Marzooqi');

-- availability: weekdays 09:00-16:00 Gulf time for the next 10 days; the 08:00 slot is a Tier 1 emergency buffer
insert into counsellor_availability (counsellor_id, slot_start, slot_end, is_emergency_buffer)
select k.id, d + make_interval(hours => h), d + make_interval(hours => h, mins => 45), h = 8
from counsellors k
cross join generate_series(date_trunc('day', now() at time zone 'Asia/Dubai') + interval '1 day',
                           date_trunc('day', now() at time zone 'Asia/Dubai') + interval '10 days', interval '1 day') as d
cross join generate_series(8, 15) as h
where extract(isodow from d) not in (6, 7)
on conflict do nothing;

-- validated reports + variants for the 12 demo people (one VUS: Maryam, SMN1)
with demo(person_id, gene, hgvs_c, hgvs_p, transcript, ncbi, zyg, sig) as (values
  ('khalid', 'HBB',  'c.20A>T',    'p.Glu7Val',       'NM_000518.5', '3043', 'heterozygous', 'pathogenic'),
  ('fatima', 'HBB',  'c.92+1G>A',  null,              'NM_000518.5', '3043', 'heterozygous', 'pathogenic'),
  ('ahmed',  'GJB2', 'c.35delG',   'p.Gly12fs',       'NM_004004.6', '2706', 'heterozygous', 'pathogenic'),
  ('noura',  'GJB2', 'c.35delG',   'p.Gly12fs',       'NM_004004.6', '2706', 'heterozygous', 'pathogenic'),
  ('saeed',  'SMN1', 'c.840C>T',   null,              'NM_000344.4', '6606', 'heterozygous', 'pathogenic'),
  ('maryam', 'SMN1', 'c.275G>C',   'p.Trp92Ser',      'NM_000344.4', '6606', 'heterozygous', 'vus'),
  ('latifa', 'G6PD', 'c.563C>T',   'p.Ser188Phe',     'NM_001360016.2', '2539', 'heterozygous', 'pathogenic'),
  ('rashid', 'CFTR', 'c.1521_1523delCTT', 'p.Phe508del', 'NM_000492.4', '1080', 'heterozygous', 'pathogenic'),
  ('aisha',  'CFTR', 'c.1521_1523delCTT', 'p.Phe508del', 'NM_000492.4', '1080', 'heterozygous', 'pathogenic')
), reports as (
  insert into genetic_reports (person_id, report_id, laboratory_name, accreditation_id, report_date, validation_status, digital_signature)
  select p.id, 'DEMO-' || upper(p.id), 'Abu Dhabi Genomics Lab (simulated)', 'CAP-0000000', r.reported_on, 'verified', 'sha256:demo-' || p.id
  from people p join results r on r.person_id = p.id
  where p.id in ('khalid', 'fatima', 'ahmed', 'noura', 'saeed', 'maryam', 'omar', 'latifa', 'rashid', 'aisha', 'hamdan', 'shamma')
  on conflict (report_id) do nothing
  returning id, person_id
)
insert into genetic_variants (report_id, gene_symbol, ncbi_gene_id, transcript_id, hgvs_c, hgvs_p, zygosity, inheritance_pattern, clinical_significance, review_status, disease_association)
select rep.id, d.gene, d.ncbi, d.transcript, d.hgvs_c, d.hgvs_p, d.zyg, g.inheritance, d.sig,
       case when d.sig = 'vus' then 'conflicting / insufficient evidence' else 'reviewed by expert panel' end, g.condition
from reports rep join demo d on d.person_id = rep.person_id join genes g on g.symbol = d.gene;

-- one FHIR DiagnosticReport per demo report (pointer + minimal payload)
insert into medical_records (person_id, resource_type, external_reference, terminology_system, clinical_code, display_name, recorded_date, raw_payload)
select r.person_id, 'DiagnosticReport', 'DiagnosticReport/' || r.report_id, 'LOINC', '51969-4', 'Genetic analysis report', r.report_date,
       jsonb_build_object('resourceType', 'DiagnosticReport', 'id', r.report_id, 'status', 'final',
                          'code', jsonb_build_object('coding', jsonb_build_array(jsonb_build_object('system', 'http://loinc.org', 'code', '51969-4'))))
from genetic_reports r
where not exists (select 1 from medical_records m where m.external_reference = 'DiagnosticReport/' || r.report_id);

-- partner sharing (scope: result summary) for the demo couples, both directions
insert into partner_consents (couple_id, owner_id, recipient_id, scope)
select c.id, x.owner, x.recipient, 'result_summary'
from couples c cross join lateral (values (c.partner_a, c.partner_b), (c.partner_b, c.partner_a)) as x(owner, recipient)
where c.id in ('c1', 'c2', 'c3', 'c4', 'c5', 'c6')
on conflict do nothing;

-- Khalid's family tree (labels only; no relatives' contact details are ever stored)
insert into family_members (owner_id, display_name, relationship, gender, evidence_status)
select 'khalid', v.name, v.rel, v.g, 'unknown'
from (values ('My father', 'father', 'M'), ('My mother', 'mother', 'F'), ('My brother', 'brother', 'M'),
             ('My sister', 'sister', 'F'), ('Cousin (father''s side)', 'first cousin', 'M')) as v(name, rel, g)
where not exists (select 1 from family_members where owner_id = 'khalid');

-- sample couples created before this upgrade (003): give them their lab reports too
with missing as (
  select p.id from people p
  where left(p.id, 2) in ('u_', 'p_')
    and not exists (select 1 from genetic_reports r where r.person_id = p.id)
), reps as (
  insert into genetic_reports (person_id, report_id, laboratory_name, accreditation_id, report_date, validation_status, digital_signature)
  select id, 'SAMPLE-' || id, 'Abu Dhabi Genomics Lab (simulated)', 'CAP-0000000', current_date, 'verified', 'sha256:sample'
  from missing
  returning id
)
insert into genetic_variants (report_id, gene_symbol, ncbi_gene_id, transcript_id, hgvs_c, hgvs_p, zygosity, inheritance_pattern, clinical_significance, review_status, disease_association)
select id, 'HBB', '3043', 'NM_000518.5', 'c.20A>T', 'p.Glu7Val', 'heterozygous', 'AR', 'pathogenic', 'reviewed by expert panel', 'Beta-thalassaemia'
from reps;

-- compute a triage case for every couple and assign counsellors
select sync_cases() as cases_computed;
