-- ==============================================================================
-- Migration 036: Enable PostgREST Read Access for Admin Directory
-- Target Database: Supabase PostgreSQL (project: oflqmhfivyzttlivgusr)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oflqmhfivyzttlivgusr/sql/new
--
-- Why this is needed:
-- The Admin Dashboard connects to Supabase PostgREST using the anon key.
-- Supabase Row Level Security (RLS) on public.accounts and public.people was
-- restricted to authenticated JWT sessions, causing PostgREST to return 0 rows
-- to the app, which forced the app to fall back to the 21 hardcoded accounts.
--
-- Running this script grants read permission so all 116 live accounts in
-- public.accounts immediately display in the Admin Dashboard!
-- ==============================================================================

-- 1. Ensure RLS is active on accounts, people, couples, locations
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 2. Grant SELECT on public.accounts for both anon and authenticated
DROP POLICY IF EXISTS accounts_read_directory ON public.accounts;
DROP POLICY IF EXISTS accounts_read_all ON public.accounts;
DROP POLICY IF EXISTS accounts_read ON public.accounts;

CREATE POLICY accounts_read_all ON public.accounts 
FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

GRANT SELECT ON public.accounts TO anon, authenticated, service_role;

-- 3. Grant SELECT on public.people
DROP POLICY IF EXISTS people_read_directory ON public.people;
DROP POLICY IF EXISTS people_read_all ON public.people;
DROP POLICY IF EXISTS people_read ON public.people;

CREATE POLICY people_read_all ON public.people 
FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

GRANT SELECT ON public.people TO anon, authenticated, service_role;

-- 4. Grant SELECT on public.couples
DROP POLICY IF EXISTS couples_read_directory ON public.couples;
DROP POLICY IF EXISTS couples_read_all ON public.couples;
DROP POLICY IF EXISTS couples_read ON public.couples;

CREATE POLICY couples_read_all ON public.couples 
FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

GRANT SELECT ON public.couples TO anon, authenticated, service_role;

-- 5. Grant SELECT on public.locations
DROP POLICY IF EXISTS locations_read_directory ON public.locations;
DROP POLICY IF EXISTS locations_read_all ON public.locations;
DROP POLICY IF EXISTS locations_read ON public.locations;

CREATE POLICY locations_read_all ON public.locations 
FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

GRANT SELECT ON public.locations TO anon, authenticated, service_role;

-- 6. Verification: Check live counts
SELECT 
    (SELECT count(*) FROM public.accounts) AS live_accounts_count,
    (SELECT count(*) FROM public.people) AS live_people_count,
    (SELECT count(*) FROM public.couples) AS live_couples_count,
    (SELECT count(*) FROM public.locations) AS live_locations_count;
