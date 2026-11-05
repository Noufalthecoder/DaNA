-- =====================================================================
-- 007_screening.sql
-- Combined query:
-- 1. Creates `screening` table with `dana_id` and Row Level Security
-- 2. Adds `dana_id` column to `accounts`, `people`, and `audit_log`
-- 3. Backfills demo DaNA IDs for standard accounts and persons
-- Run this in Supabase SQL Editor.
-- =====================================================================

-- 1. Create the `screening` table for all premarital screening intakes
create table if not exists screening (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dana_id       text unique not null,
  person_id     text references people(id),
  mode          text not null default 'manual' check (mode in ('uae_pass', 'manual')),
  completed     boolean not null default false,
  personal      jsonb not null default '{}'::jsonb,
  medical       jsonb not null default '{}'::jsonb,
  family        jsonb not null default '[]'::jsonb,
  compliance    jsonb not null default '{}'::jsonb,
  consent       jsonb not null default '{}'::jsonb,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast lookup by DaNA ID
create index if not exists idx_screening_dana_id on screening (dana_id);

-- Enable Row Level Security (RLS)
alter table screening enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Users can view and update own screening" on screening;
drop policy if exists "Clinicians and Admin can view submitted screenings" on screening;

-- Couples can view and update their own screening record
create policy "Users can view and update own screening"
  on screening for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Counsellors and DoH Admins can view submitted screening records for clinical review
create policy "Clinicians and Admin can view submitted screenings"
  on screening for select
  using (
    exists (
      select 1 from accounts
      where accounts.user_id = auth.uid()
      and accounts.role in ('counsellor', 'admin')
    )
  );

-- 2. Add `dana_id` column to `accounts` (user accounts)
alter table accounts add column if not exists dana_id text unique;
create index if not exists idx_accounts_dana_id on accounts (dana_id);

-- 3. Add `dana_id` column to `people` (citizen clinical registry)
alter table people add column if not exists dana_id text unique;
create index if not exists idx_people_dana_id on people (dana_id);

-- 4. Add `dana_id` column to `audit_log` (clinical governance trail)
alter table audit_log add column if not exists dana_id text;
create index if not exists idx_audit_log_dana_id on audit_log (dana_id);

-- 5. Backfill demo personas with standard DaNA IDs
update people set dana_id = 'DANA-2026-18293' where id = 'khalid';
update people set dana_id = 'DANA-2026-34829' where id = 'fatima';
update people set dana_id = 'DANA-2026-72810' where id = 'ahmed';
update people set dana_id = 'DANA-2026-51920' where id = 'noura';
update people set dana_id = 'DANA-2026-92810' where id = 'saeed';
update people set dana_id = 'DANA-2026-83910' where id = 'maryam';

-- 6. Link demo accounts with their person's DaNA ID
update accounts set dana_id = p.dana_id
from people p
where accounts.person_id = p.id
  and p.dana_id is not null
  and accounts.dana_id is null;
