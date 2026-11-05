-- ==============================================================================
-- DaNA: Connection Requests & Cross-Account Partner Linking (Migration 008)
-- Fixes RLS policies and table schema so user requests from one account
-- reliably reach the other account and persist in the database.
-- Run in Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ==============================================================================

-- 1. Ensure connection_requests table exists with all required columns
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    receiver_id TEXT,                        -- Can be person_id, user_id UUID, or email
    recipient_email TEXT,
    recipient_phone TEXT,
    channel VARCHAR(20) DEFAULT 'in_app' CHECK (channel IN ('in_app', 'whatsapp', 'gmail')),
    invitation_sent BOOLEAN DEFAULT true,
    invitation_sent_at TIMESTAMPTZ DEFAULT now(),
    accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add note column if table was previously created without it
ALTER TABLE public.connection_requests 
    ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Indexes for fast lookup by sender, receiver, and email
CREATE INDEX IF NOT EXISTS idx_conn_requests_receiver
    ON public.connection_requests (receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_conn_requests_sender
    ON public.connection_requests (sender_id, status);

CREATE INDEX IF NOT EXISTS idx_conn_requests_email
    ON public.connection_requests (recipient_email, status);

-- 3. Grant table permissions to public roles (anon and authenticated)
GRANT ALL ON public.connection_requests TO anon, authenticated, service_role;
GRANT ALL ON public.couples TO anon, authenticated, service_role;
GRANT ALL ON public.people TO anon, authenticated, service_role;
GRANT ALL ON public.accounts TO anon, authenticated, service_role;

-- 4. Enable Row Level Security with full read/write policies on connection_requests
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_connection_requests_select" ON public.connection_requests;
CREATE POLICY "allow_all_connection_requests_select" ON public.connection_requests
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "allow_all_connection_requests_insert" ON public.connection_requests;
CREATE POLICY "allow_all_connection_requests_insert" ON public.connection_requests
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_connection_requests_update" ON public.connection_requests;
CREATE POLICY "allow_all_connection_requests_update" ON public.connection_requests
    FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_connection_requests_delete" ON public.connection_requests;
CREATE POLICY "allow_all_connection_requests_delete" ON public.connection_requests
    FOR DELETE TO public USING (true);

-- 5. Enable couples table read/write policies for couple formation
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couples_read_all" ON public.couples;
CREATE POLICY "couples_read_all" ON public.couples
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "couples_insert_all" ON public.couples;
CREATE POLICY "couples_insert_all" ON public.couples
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "couples_update_all" ON public.couples;
CREATE POLICY "couples_update_all" ON public.couples
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 6. Enable search/read on accounts & people so candidate partners can be found
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_search_all" ON public.accounts;
CREATE POLICY "accounts_search_all" ON public.accounts
    FOR SELECT TO public USING (true);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_read_all" ON public.people;
CREATE POLICY "people_read_all" ON public.people
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "people_insert_all" ON public.people;
CREATE POLICY "people_insert_all" ON public.people
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "people_update_all" ON public.people;
CREATE POLICY "people_update_all" ON public.people
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 7. Add connection_requests and couples to Supabase Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'connection_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'couples'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- In case user does not have superuser privileges on publication, ignore safely
    NULL;
END $$;
