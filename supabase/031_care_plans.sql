-- 031: 7-Stage Personalised Care Plan Tracker schema and RLS policies
-- Supports longitudinal tracking:
-- Stage 1: Screening & discovery (Roots)
-- Stage 2: Couple assessment (Bonds)
-- Stage 3: Genetic counselling
-- Stage 4: Family planning
-- Stage 5: Pregnancy journey
-- Stage 6: Birth preparation
-- Stage 7: Childbirth & newborn care (Journey milestone)

create table if not exists care_plans (
  id                    uuid primary key default gen_random_uuid(),
  couple_id             text not null unique references couples (id) on delete cascade,
  active_stage_id       int not null default 3 check (active_stage_id between 1 and 7),
  completed_checkpoints text[] not null default array[
    'individual_screening',
    'medical_family_history',
    'pedigree_completion',
    'results_explanations',
    'partner_connection_consent',
    'joint_risk_assessment',
    'reproductive_options',
    'appointment_booking'
  ],
  condition             text default 'Beta-thalassaemia (HBB)',
  tier                  int default 2 check (tier in (1, 2, 3)),
  counsellor_name       text default 'Dr. Mariam Al Hosani',
  referrals             jsonb not null default '[]'::jsonb,
  pregnancy             jsonb not null default '{
    "is_pregnant": false,
    "weeks": null,
    "edd": null,
    "delivery_hospital": "Danat Al Emarat Hospital for Women & Children, Abu Dhabi"
  }'::jsonb,
  childbirth            jsonb not null default '{
    "delivered": false,
    "baby_name": null,
    "birth_date": null,
    "newborn_screen_status": "pending",
    "genetic_follow_up_needed": true
  }'::jsonb,
  clinical_notes        text default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Index for instant lookup by couple
create index if not exists idx_care_plans_couple on care_plans (couple_id);

-- Enable Row Level Security (RLS)
alter table care_plans enable row level security;

-- Helper to check if current authenticated user belongs to couple
create or replace function is_couple_member(p_couple_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from couples c
      join accounts a on a.user_id = auth.uid()
     where c.id = p_couple_id
       and (c.partner_a = a.person_id or c.partner_b = a.person_id)
  );
$$;

-- RLS 1: Couple can view their own plan
drop policy if exists "Couples can read their own care plan" on care_plans;
create policy "Couples can read their own care plan"
  on care_plans for select
  using (is_couple_member(couple_id));

-- RLS 2: Couple can update checkpoints, pregnancy, and childbirth in their own plan
drop policy if exists "Couples can update their own care plan" on care_plans;
create policy "Couples can update their own care plan"
  on care_plans for update
  using (is_couple_member(couple_id))
  with check (is_couple_member(couple_id));

-- RLS 3: Licensed counsellors can view and update assigned cases
drop policy if exists "Counsellors can view assigned care plans" on care_plans;
create policy "Counsellors can view assigned care plans"
  on care_plans for all
  using (
    exists (
      select 1
        from accounts a
       where a.user_id = auth.uid()
         and a.role in ('counsellor', 'admin')
    )
  );

-- Seed default demo plan for couple 'c1' if missing
insert into care_plans (couple_id, active_stage_id, condition, tier, counsellor_name, referrals, pregnancy, childbirth)
values (
  'c1',
  3,
  'Beta-thalassaemia (HBB)',
  2,
  'Dr. Mariam Al Hosani',
  '[
    {
      "id": "REF-2026-HBB-041",
      "destination": "IVF / PGT-M",
      "facility": "Cleveland Clinic Abu Dhabi · Fertility Center",
      "priority": "high",
      "status": "DISPATCHED",
      "dispatched_at": "2026-11-04T10:15:00Z",
      "reason": "Pre-implantation Genetic Testing for HBB c.20A>T / c.92+1G>A carrier pair"
    }
  ]'::jsonb,
  '{
    "is_pregnant": false,
    "weeks": null,
    "edd": null,
    "delivery_hospital": "Danat Al Emarat Hospital for Women & Children, Abu Dhabi"
  }'::jsonb,
  '{
    "delivered": false,
    "baby_name": null,
    "birth_date": null,
    "newborn_screen_status": "pending",
    "genetic_follow_up_needed": true
  }'::jsonb
)
on conflict (couple_id) do nothing;
