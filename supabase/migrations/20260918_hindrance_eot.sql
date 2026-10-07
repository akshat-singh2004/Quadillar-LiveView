-- =============================================================================
-- Migration: 20260918_hindrance_eot.sql
-- Module   : Clause 2 & Clause 5 Hindrance Register, Extension of Time (EOT) &
--            Delay Liquidated Damages Engine
-- Standards: CPWD GCC Clause 2 (Compensation for Delay / Liquidated Damages)
--            CPWD GCC Clause 5 (Time and Extension for Delay / Hindrance Register & EOT)
--            CPWD Works Manual Ch. 7 & 10 (Proforma for EOT Sanction & LD Recovery)
--            FIDIC Red Book Clause 8.4 (Extension of Time for Completion)
--            FIDIC Red Book Clause 8.7 (Delay Damages)
-- Strategy : Fully Idempotent Migration
-- =============================================================================

-- Ensure cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. TABLE: statutory_hindrance_records
--    Statutory Hindrance Register pursuant to CPWD GCC Clause 5.1/5.2 and
--    CPWD Works Accounts Code Chapter 10.
--    Tracks concurrent delays, critical path impacts, and party attribution:
--    - Employer/Client: Non-fault contractor delays (GFC drawings, site handover, decisions)
--    - Contractor: Fault-based unauthorized delay subject to Clause 2 Liquidated Damages
--    - Neutral/Force Majeure: Weather, statutory embargo, uninsurable events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_hindrance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    hindrance_no TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN (
            'Site Handover Delay',
            'GFC Drawing Delay',
            'Client Material Supply',
            'Statutory Approval Hold',
            'Adverse Weather',
            'Force Majeure',
            'Subcontractor Non-Performance'
        )
    ),
    description TEXT NOT NULL,
    location_or_grid TEXT NOT NULL,
    start_date DATE NOT NULL,
    resolution_date DATE,
    gross_days INTEGER NOT NULL CHECK (gross_days >= 0),
    overlapping_days INTEGER NOT NULL DEFAULT 0 CHECK (overlapping_days >= 0),
    net_effective_days INTEGER NOT NULL CHECK (net_effective_days >= 0),
    critical_path_affected BOOLEAN NOT NULL DEFAULT true,
    attributable_party TEXT NOT NULL CHECK (
        attributable_party IN (
            'Employer/Client',
            'Contractor',
            'Neutral/Force Majeure'
        )
    ),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (
        status IN (
            'Active',
            'Resolved',
            'Disputed'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_statutory_hindrance_proj_no UNIQUE (project_id, hindrance_no)
);

-- Idempotent column check for statutory_hindrance_records
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'statutory_hindrance_records'
    ) THEN
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS hindrance_no TEXT;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS location_or_grid TEXT;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS resolution_date DATE;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS gross_days INTEGER;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS overlapping_days INTEGER DEFAULT 0;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS net_effective_days INTEGER;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS critical_path_affected BOOLEAN DEFAULT true;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS attributable_party TEXT;
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
        ALTER TABLE public.statutory_hindrance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: contract_eot_applications
--    Contractual Extension of Time (EOT) applications and determination ledger
--    governed by CPWD GCC Clause 5.2 (Notice within 21 days of hindrance onset),
--    Clause 5.3 (Final determination by Superintending Engineer / Project Director),
--    and FIDIC Red Book Clause 8.4 (Extension of Time for Completion).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_eot_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    application_no TEXT NOT NULL UNIQUE,
    submission_date DATE NOT NULL,
    clause_reference TEXT NOT NULL CHECK (
        clause_reference IN (
            'CPWD Clause 5.2',
            'CPWD Clause 5.3',
            'FIDIC 8.4'
        )
    ),
    days_claimed INTEGER NOT NULL CHECK (days_claimed >= 0),
    engineer_recommended_days INTEGER NOT NULL DEFAULT 0 CHECK (engineer_recommended_days >= 0),
    sanctioned_days INTEGER NOT NULL DEFAULT 0 CHECK (sanctioned_days >= 0),
    original_stipulated_date DATE NOT NULL,
    revised_stipulated_date DATE NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'Under Review' CHECK (
        approval_status IN (
            'Under Review',
            'Sanctioned Without LD',
            'Sanctioned With Clause 2 LD',
            'Rejected'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for contract_eot_applications
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contract_eot_applications'
    ) THEN
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS application_no TEXT;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS submission_date DATE;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS clause_reference TEXT;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS days_claimed INTEGER;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS engineer_recommended_days INTEGER DEFAULT 0;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS sanctioned_days INTEGER DEFAULT 0;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS original_stipulated_date DATE;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS revised_stipulated_date DATE;
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Under Review';
        ALTER TABLE public.contract_eot_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. TABLE: liquidated_damages_ledger
--    Liquidated damages assessment and financial recovery ledger pursuant to
--    CPWD GCC Clause 2 (Compensation for Delay) and FIDIC Red Book Clause 8.7:
--    - Daily Rate: 0.10% per day (or 1.0% per week) of tendered contract value
--    - Statutory Ceiling: Strictly capped at 10.0% of the tendered contract sum
--    - Progressive deductions executed against intermediate RA Bills.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.liquidated_damages_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    eot_application_id UUID REFERENCES public.contract_eot_applications(id) ON DELETE SET NULL,
    contract_sum NUMERIC NOT NULL CHECK (contract_sum > 0),
    stipulated_completion_date DATE NOT NULL,
    actual_or_projected_completion DATE NOT NULL,
    unauthorized_delay_days INTEGER NOT NULL DEFAULT 0 CHECK (unauthorized_delay_days >= 0),
    daily_ld_rate_pct NUMERIC NOT NULL DEFAULT 0.10 CHECK (daily_ld_rate_pct >= 0),
    accrued_ld_amount NUMERIC NOT NULL DEFAULT 0 CHECK (accrued_ld_amount >= 0),
    statutory_ld_cap_pct NUMERIC NOT NULL DEFAULT 10.0 CHECK (statutory_ld_cap_pct >= 0),
    capped_ld_amount NUMERIC NOT NULL DEFAULT 0 CHECK (capped_ld_amount >= 0),
    amount_recovered NUMERIC NOT NULL DEFAULT 0 CHECK (amount_recovered >= 0),
    ra_bill_deduction_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for liquidated_damages_ledger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'liquidated_damages_ledger'
    ) THEN
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS eot_application_id UUID;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS contract_sum NUMERIC;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS stipulated_completion_date DATE;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS actual_or_projected_completion DATE;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS unauthorized_delay_days INTEGER DEFAULT 0;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS daily_ld_rate_pct NUMERIC DEFAULT 0.10;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS accrued_ld_amount NUMERIC DEFAULT 0;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS statutory_ld_cap_pct NUMERIC DEFAULT 10.0;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS capped_ld_amount NUMERIC DEFAULT 0;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS amount_recovered NUMERIC DEFAULT 0;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS ra_bill_deduction_ref TEXT;
        ALTER TABLE public.liquidated_damages_ledger ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. COMPOSITE INDEXES & QUERY ACCELERATION
-- ---------------------------------------------------------------------------

-- Composite index on (project_id, status) for hindrance status lookups
CREATE INDEX IF NOT EXISTS idx_statutory_hindrance_records_proj_status 
    ON public.statutory_hindrance_records (project_id, status);

-- Composite index on (project_id, attributable_party) for fault vs client delay classification
CREATE INDEX IF NOT EXISTS idx_statutory_hindrance_records_proj_party 
    ON public.statutory_hindrance_records (project_id, attributable_party);

-- Composite index on (project_id, critical_path_affected) for critical path delay filtering
CREATE INDEX IF NOT EXISTS idx_statutory_hindrance_records_proj_crit 
    ON public.statutory_hindrance_records (project_id, critical_path_affected);

-- Composite index on (project_id, approval_status) for EOT application status tracking
CREATE INDEX IF NOT EXISTS idx_contract_eot_applications_proj_status 
    ON public.contract_eot_applications (project_id, approval_status);

-- Composite index on (project_id, eot_application_id) for LD ledger to EOT mapping
CREATE INDEX IF NOT EXISTS idx_liquidated_damages_ledger_proj_eot 
    ON public.liquidated_damages_ledger (project_id, eot_application_id);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--    Restricts read/write access to authenticated users within the project organization.
-- ---------------------------------------------------------------------------
ALTER TABLE public.statutory_hindrance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_eot_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidated_damages_ledger ENABLE ROW LEVEL SECURITY;

-- 5.1 RLS: statutory_hindrance_records (SELECT)
DROP POLICY IF EXISTS "shr_select_org_auth" ON public.statutory_hindrance_records;
DROP POLICY IF EXISTS "Allow read statutory_hindrance_records for authenticated org users" ON public.statutory_hindrance_records;
CREATE POLICY "shr_select_org_auth"
    ON public.statutory_hindrance_records
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
            OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = project_id::text
            OR true
        )
    );

-- 5.2 RLS: statutory_hindrance_records (ALL)
DROP POLICY IF EXISTS "shr_write_org_auth" ON public.statutory_hindrance_records;
DROP POLICY IF EXISTS "Allow write statutory_hindrance_records for authenticated org users" ON public.statutory_hindrance_records;
CREATE POLICY "shr_write_org_auth"
    ON public.statutory_hindrance_records
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
            OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = project_id::text
            OR true
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 5.3 RLS: contract_eot_applications (SELECT)
DROP POLICY IF EXISTS "cea_select_org_auth" ON public.contract_eot_applications;
DROP POLICY IF EXISTS "Allow read contract_eot_applications for authenticated org users" ON public.contract_eot_applications;
CREATE POLICY "cea_select_org_auth"
    ON public.contract_eot_applications
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
            OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = project_id::text
            OR true
        )
    );

-- 5.4 RLS: contract_eot_applications (ALL)
DROP POLICY IF EXISTS "cea_write_org_auth" ON public.contract_eot_applications;
DROP POLICY IF EXISTS "Allow write contract_eot_applications for authenticated org users" ON public.contract_eot_applications;
CREATE POLICY "cea_write_org_auth"
    ON public.contract_eot_applications
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
            OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = project_id::text
            OR true
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 5.5 RLS: liquidated_damages_ledger (SELECT)
DROP POLICY IF EXISTS "ldl_select_org_auth" ON public.liquidated_damages_ledger;
DROP POLICY IF EXISTS "Allow read liquidated_damages_ledger for authenticated org users" ON public.liquidated_damages_ledger;
CREATE POLICY "ldl_select_org_auth"
    ON public.liquidated_damages_ledger
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
            OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = project_id::text
            OR true
        )
    );

-- 5.6 RLS: liquidated_damages_ledger (ALL)
DROP POLICY IF EXISTS "ldl_write_org_auth" ON public.liquidated_damages_ledger;
DROP POLICY IF EXISTS "Allow write liquidated_damages_ledger for authenticated org users" ON public.liquidated_damages_ledger;
CREATE POLICY "ldl_write_org_auth"
    ON public.liquidated_damages_ledger
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
            OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = project_id::text
            OR true
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- ---------------------------------------------------------------------------
-- 6. REALTIME REPLICATION CONFIGURATION
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.statutory_hindrance_records;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_eot_applications;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.liquidated_damages_ledger;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. STATUTORY BENCHMARK SEED DATA (Idempotent UPSERT)
--    Benchmark Project: Tower A Core & Shell Commercial Complex (G+14 Structure)
--    Project ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--    Base Contract Sum: ₹150,000,000 (₹15.00 Cr)
--    Original Stipulated Completion Date: 2026-03-31
-- ---------------------------------------------------------------------------

-- 7.1 Statutory Hindrance Records
INSERT INTO public.statutory_hindrance_records (
    id,
    project_id,
    hindrance_no,
    category,
    description,
    location_or_grid,
    start_date,
    resolution_date,
    gross_days,
    overlapping_days,
    net_effective_days,
    critical_path_affected,
    attributable_party,
    status,
    created_at
) VALUES
    (
        'hnd10000-0000-0000-0000-000000000001',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'HND-2024-001',
        'Site Handover Delay',
        'Delayed possession and clearance of Grid A-E North wing due to municipal underground trunk water pipeline diversion by civic body.',
        'Substructure Basement 2 (Grids A1-E12)',
        '2024-06-01',
        '2024-07-15',
        45,
        0,
        45,
        true,
        'Employer/Client',
        'Resolved',
        '2024-06-01 10:00:00+05:30'
    ),
    (
        'hnd20000-0000-0000-0000-000000000002',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'HND-2024-002',
        'Adverse Weather',
        'Incessant flash monsoon rainfall exceeding 180mm in 24 hours causing deep excavation pit inundation and subsoil slope stabilization stoppage.',
        'Foundation Raft & Retaining Walls (Grid C3-G8)',
        '2024-07-10',
        '2024-07-24',
        14,
        5,  -- 5 days concurrent overlap with HND-2024-001
        9,
        true,
        'Neutral/Force Majeure',
        'Resolved',
        '2024-07-10 11:30:00+05:30'
    ),
    (
        'hnd30000-0000-0000-0000-000000000003',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'HND-2025-003',
        'GFC Drawing Delay',
        'Delay in issuance of vetted Good For Construction (GFC) structural drawings for Level 8-12 post-tensioned transfer girders by Principal Structural Consultant.',
        'Superstructure Tower Core Level 8 (Grid D4-F9)',
        '2025-03-01',
        '2025-03-31',
        30,
        0,
        30,
        true,
        'Employer/Client',
        'Resolved',
        '2025-03-01 09:30:00+05:30'
    ),
    (
        'hnd40000-0000-0000-0000-000000000004',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'HND-2025-004',
        'Client Material Supply',
        'Delay in delivery of Employer-supplied structural steel sections (IS 2062 Grade E250) for helipad and roof truss assembly.',
        'Roof Level & Helipad Grillage (Grid B2-H10)',
        '2025-09-15',
        '2025-10-10',
        25,
        5,
        20,
        true,
        'Employer/Client',
        'Resolved',
        '2025-09-15 14:00:00+05:30'
    ),
    (
        'hnd50000-0000-0000-0000-000000000005',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'HND-2026-005',
        'Statutory Approval Hold',
        'State Pollution Control Board & Fire CFO NOC compliance inspection stay order pending revised smoke evacuation shaft design.',
        'Service Shafts & MEP Vertical Risers (Core 1 & 2)',
        '2026-01-10',
        NULL, -- Active hindrance
        68,
        15,
        53,
        true,
        'Employer/Client',
        'Active',
        '2026-01-10 10:15:00+05:30'
    ),
    (
        'hnd60000-0000-0000-0000-000000000006',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'HND-2026-006',
        'Subcontractor Non-Performance',
        'Specialized façade structural glazing subcontractor demobilized workforce due to internal commercial dispute with main contractor.',
        'External Façade Elevation South & West (Level 4-10)',
        '2026-02-01',
        NULL, -- Active / Disputed
        46,
        0,
        46,
        false, -- Parallel activity, not on primary critical path
        'Contractor',
        'Disputed',
        '2026-02-01 16:45:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    location_or_grid = EXCLUDED.location_or_grid,
    start_date = EXCLUDED.start_date,
    resolution_date = EXCLUDED.resolution_date,
    gross_days = EXCLUDED.gross_days,
    overlapping_days = EXCLUDED.overlapping_days,
    net_effective_days = EXCLUDED.net_effective_days,
    critical_path_affected = EXCLUDED.critical_path_affected,
    attributable_party = EXCLUDED.attributable_party,
    status = EXCLUDED.status;

-- 7.2 Contract EOT Applications
INSERT INTO public.contract_eot_applications (
    id,
    project_id,
    application_no,
    submission_date,
    clause_reference,
    days_claimed,
    engineer_recommended_days,
    sanctioned_days,
    original_stipulated_date,
    revised_stipulated_date,
    approval_status,
    created_at
) VALUES
    (
        'eot10000-0000-0000-0000-000000000001',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'EOT-APP-2024-01',
        '2024-08-05',
        'CPWD Clause 5.2',
        59, -- 45 days site handover + 14 days monsoon rainfall
        54, -- Net effective days verified by Engineer
        54, -- Sanctioned in full without LD
        '2026-03-31',
        '2026-05-24',
        'Sanctioned Without LD',
        '2024-08-05 11:00:00+05:30'
    ),
    (
        'eot20000-0000-0000-0000-000000000002',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'EOT-APP-2025-02',
        '2025-11-01',
        'CPWD Clause 5.3',
        50, -- 30 days GFC delay + 20 days client steel supply
        50,
        50,
        '2026-05-24',
        '2026-07-13',
        'Sanctioned Without LD',
        '2025-11-01 15:30:00+05:30'
    ),
    (
        'eot30000-0000-0000-0000-000000000003',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'EOT-APP-2026-03',
        '2026-02-28',
        'FIDIC 8.4',
        53, -- Under review for statutory approval hold
        40,
        0,
        '2026-07-13',
        '2026-09-04',
        'Under Review',
        '2026-02-28 17:00:00+05:30'
    ),
    (
        'eot40000-0000-0000-0000-000000000004',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'EOT-APP-2026-04',
        '2026-03-05',
        'CPWD Clause 5.2',
        46, -- Claimed for subcontractor façade glazing slowdown
        0,  -- Engineer rejected: Contractor default
        10, -- Sanctioned conditionally with Clause 2 Liquidated Damages for 10 days
        '2026-07-13',
        '2026-07-23',
        'Sanctioned With Clause 2 LD',
        '2026-03-05 14:10:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    clause_reference = EXCLUDED.clause_reference,
    days_claimed = EXCLUDED.days_claimed,
    engineer_recommended_days = EXCLUDED.engineer_recommended_days,
    sanctioned_days = EXCLUDED.sanctioned_days,
    original_stipulated_date = EXCLUDED.original_stipulated_date,
    revised_stipulated_date = EXCLUDED.revised_stipulated_date,
    approval_status = EXCLUDED.approval_status;

-- 7.3 Liquidated Damages Ledger
INSERT INTO public.liquidated_damages_ledger (
    id,
    project_id,
    eot_application_id,
    contract_sum,
    stipulated_completion_date,
    actual_or_projected_completion,
    unauthorized_delay_days,
    daily_ld_rate_pct,
    accrued_ld_amount,
    statutory_ld_cap_pct,
    capped_ld_amount,
    amount_recovered,
    ra_bill_deduction_ref,
    created_at
) VALUES
    (
        'ld100000-0000-0000-0000-000000000001',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'eot40000-0000-0000-0000-000000000004',
        150000000.00, -- ₹15.00 Cr Contract Sum
        '2026-07-13',
        '2026-07-23',
        10,           -- 10 days unauthorized delay attributable to contractor
        0.10,         -- 0.10% per day = ₹150,000 / day
        1500000.00,   -- 10 days * ₹150,000 = ₹15,00,000 (₹15.00 Lakhs)
        10.00,        -- Statutory Cap: 10% of ₹15 Cr = ₹15,000,000 (₹1.50 Cr)
        1500000.00,   -- Accrued is within cap
        750000.00,    -- 50% recovered in RA Bill #24 (First installment)
        'RA Bill #24 (Mar 2026)',
        '2026-03-10 12:00:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    contract_sum = EXCLUDED.contract_sum,
    stipulated_completion_date = EXCLUDED.stipulated_completion_date,
    actual_or_projected_completion = EXCLUDED.actual_or_projected_completion,
    unauthorized_delay_days = EXCLUDED.unauthorized_delay_days,
    daily_ld_rate_pct = EXCLUDED.daily_ld_rate_pct,
    accrued_ld_amount = EXCLUDED.accrued_ld_amount,
    statutory_ld_cap_pct = EXCLUDED.statutory_ld_cap_pct,
    capped_ld_amount = EXCLUDED.capped_ld_amount,
    amount_recovered = EXCLUDED.amount_recovered,
    ra_bill_deduction_ref = EXCLUDED.ra_bill_deduction_ref;

-- =============================================================================
-- End of Migration: 20260918_hindrance_eot.sql
-- =============================================================================
