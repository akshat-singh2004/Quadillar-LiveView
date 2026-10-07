-- ============================================================================
-- Quadillar LiveView: Zero-Trust Statutory Core Migration
-- CPWD Works Manual / FIDIC Red Book Multi-Tenant Isolation
-- File: supabase/migrations/01_init_statutory_schema.sql
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_role') THEN
        CREATE TYPE tenant_role AS ENUM ('architect', 'client', 'contractor');
    END IF;
END$$;

-- 2. user_profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role tenant_role NOT NULL,
    statutory_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contract_baseline NUMERIC NOT NULL DEFAULT 0,
    architect_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    gcc_protocol TEXT NOT NULL DEFAULT 'CPWD Works Manual 2024',
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- 4. statutory_ledgers Table
CREATE TABLE IF NOT EXISTS statutory_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    financial_impact NUMERIC NOT NULL DEFAULT 0,
    delay_days INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
    ON user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_projects_architect_id 
    ON projects(architect_id);

CREATE INDEX IF NOT EXISTS idx_projects_client_id 
    ON projects(client_id);

CREATE INDEX IF NOT EXISTS idx_projects_contractor_id 
    ON projects(contractor_id);

CREATE INDEX IF NOT EXISTS idx_statutory_ledgers_project_id 
    ON statutory_ledgers(project_id);

CREATE INDEX IF NOT EXISTS idx_statutory_ledgers_created_at 
    ON statutory_ledgers(created_at);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_ledgers ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: user_profiles
-- Users can SELECT and UPDATE only their own row.
CREATE POLICY "user_profiles_select_own"
ON user_profiles
FOR SELECT
USING (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_update_own"
ON user_profiles
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
WITH CHECK (id = (SELECT auth.uid()));

-- 8. RLS Policies: projects
-- Users can SELECT a project only if their auth.uid() matches architect_id, client_id, or contractor_id.
CREATE POLICY "projects_select_verified_parties"
ON projects
FOR SELECT
USING (
    architect_id = (SELECT auth.uid())
    OR client_id = (SELECT auth.uid())
    OR contractor_id = (SELECT auth.uid())
);

CREATE POLICY "projects_insert_architect"
ON projects
FOR INSERT
WITH CHECK (architect_id = (SELECT auth.uid()));

CREATE POLICY "projects_update_architect"
ON projects
FOR UPDATE
USING (architect_id = (SELECT auth.uid()))
WITH CHECK (architect_id = (SELECT auth.uid()));

-- 9. RLS Policies: statutory_ledgers
-- Users can SELECT ledger entries only if they are a verified party to the parent project_id (optimized EXISTS).
CREATE POLICY "statutory_ledgers_select_verified_party"
ON statutory_ledgers
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM projects p
        WHERE p.id = statutory_ledgers.project_id
          AND (
              p.architect_id = (SELECT auth.uid())
              OR p.client_id = (SELECT auth.uid())
              OR p.contractor_id = (SELECT auth.uid())
          )
    )
);

-- Write Access: Only architect_id users can INSERT statutory ledgers.
CREATE POLICY "statutory_ledgers_insert_architect_only"
ON statutory_ledgers
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM projects p
        WHERE p.id = statutory_ledgers.project_id
          AND p.architect_id = (SELECT auth.uid())
    )
);

-- Write Access: Only architect_id users can UPDATE statutory ledgers.
CREATE POLICY "statutory_ledgers_update_architect_only"
ON statutory_ledgers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM projects p
        WHERE p.id = statutory_ledgers.project_id
          AND p.architect_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM projects p
        WHERE p.id = statutory_ledgers.project_id
          AND p.architect_id = (SELECT auth.uid())
    )
);
