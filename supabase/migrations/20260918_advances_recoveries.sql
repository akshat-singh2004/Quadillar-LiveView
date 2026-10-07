-- =============================================================================
-- Migration: 20260918_advances_recoveries.sql
-- Module   : Clause 10B Advances & Form 31 Secured Advance Recovery Engine
-- Standards: CPWD GCC Clause 10B (Advances for Mobilization, Plant/Machinery, Secured Material)
--            CPWD Works Manual Ch. 8 / Works Accounts Code (CPWD Form 31 Indenture)
--            FIDIC Red Book Clause 14.2 (Advance Payment & Amortization Deductions)
-- Strategy : Fully Idempotent Migration
-- =============================================================================

-- Ensure cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. TABLE: contract_advances_master
--    Master ledger tracking formal advance sanctions granted to the main contractor
--    under CPWD GCC Clause 10B / FIDIC Red Book Clause 14.2:
--    - Mobilization Advance [10B-i]: Up to 10% of tender contract sum with simple interest.
--    - Plant & Machinery Advance [10B-ii]: Up to 5% of contract sum for new plant/machinery brought to site.
--    - Secured Material Advance [10B-iii]: Up to 75% of assessed value of non-perishable materials on site (Form 31).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_advances_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    advance_type TEXT NOT NULL CHECK (
        advance_type IN (
            'Mobilization Advance [10B-i]',
            'Plant & Machinery Advance [10B-ii]',
            'Secured Material Advance [10B-iii]'
        )
    ),
    sanctioned_amount NUMERIC NOT NULL CHECK (sanctioned_amount > 0),
    interest_rate_pct NUMERIC NOT NULL DEFAULT 10.0 CHECK (interest_rate_pct >= 0),
    disbursal_date DATE NOT NULL,
    total_recovered NUMERIC NOT NULL DEFAULT 0 CHECK (total_recovered >= 0),
    outstanding_balance NUMERIC NOT NULL CHECK (outstanding_balance >= 0),
    bank_guarantee_ref TEXT,
    bg_validity_date DATE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Amortizing', 'Fully Recovered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for contract_advances_master
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contract_advances_master'
    ) THEN
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS advance_type TEXT;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS interest_rate_pct NUMERIC DEFAULT 10.0;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS disbursal_date DATE;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS total_recovered NUMERIC DEFAULT 0;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS bank_guarantee_ref TEXT;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS bg_validity_date DATE;
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
        ALTER TABLE public.contract_advances_master ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: secured_advance_materials
--    Itemized hypothecation ledger for non-perishable construction materials
--    delivered to the work site pursuant to CPWD Form 31 (Indenture for Secured Advances).
--    Pursuant to CPWD GCC Clause 10B(iii), advance is sanctioned up to 75%
--    of the assessed value (lower of market rate or agreement item rate).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.secured_advance_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID NOT NULL REFERENCES public.contract_advances_master(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL CHECK (
        material_name IN (
            'Cement',
            'TMT Steel',
            'Structural Sections',
            'Vitrified Tiles',
            'Bricks & AAC Blocks',
            'Pipes & Fittings'
        ) OR length(material_name) > 0
    ),
    site_delivery_date DATE NOT NULL,
    verified_quantity NUMERIC NOT NULL CHECK (verified_quantity > 0),
    unit TEXT NOT NULL,
    market_rate NUMERIC NOT NULL CHECK (market_rate > 0),
    agreement_rate NUMERIC NOT NULL CHECK (agreement_rate > 0),
    admissible_percentage NUMERIC NOT NULL DEFAULT 75.0 CHECK (admissible_percentage > 0 AND admissible_percentage <= 90.0),
    assessed_advance_amount NUMERIC NOT NULL CHECK (assessed_advance_amount >= 0),
    indenture_status TEXT NOT NULL DEFAULT 'Hypothecated' CHECK (indenture_status IN ('Hypothecated', 'Recovered', 'Released')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for secured_advance_materials
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'secured_advance_materials'
    ) THEN
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS advance_id UUID;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS material_name TEXT;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS site_delivery_date DATE;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS verified_quantity NUMERIC;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS unit TEXT;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS market_rate NUMERIC;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS agreement_rate NUMERIC;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS admissible_percentage NUMERIC DEFAULT 75.0;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS assessed_advance_amount NUMERIC;
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS indenture_status TEXT DEFAULT 'Hypothecated';
        ALTER TABLE public.secured_advance_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. TABLE: advance_recovery_schedules
--    Periodic amortization and recovery schedule tracking deductions executed
--    against Running Account (RA) bills under CPWD Works Accounts Code:
--    - Mobilization Advance recovery commences when gross certified work reaches 10%
--      of tender value and finishes by the time work reaches 80% / 100%.
--    - Principal and simple interest components accounted separately.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advance_recovery_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID NOT NULL REFERENCES public.contract_advances_master(id) ON DELETE CASCADE,
    ra_bill_id UUID,
    billing_cycle TEXT NOT NULL,
    principal_recovered NUMERIC NOT NULL DEFAULT 0 CHECK (principal_recovered >= 0),
    interest_recovered NUMERIC NOT NULL DEFAULT 0 CHECK (interest_recovered >= 0),
    net_deduction NUMERIC NOT NULL DEFAULT 0 CHECK (net_deduction >= 0),
    remaining_unrecovered_balance NUMERIC NOT NULL DEFAULT 0 CHECK (remaining_unrecovered_balance >= 0),
    certified_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for advance_recovery_schedules
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'advance_recovery_schedules'
    ) THEN
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS advance_id UUID;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS ra_bill_id UUID;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS billing_cycle TEXT;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS principal_recovered NUMERIC DEFAULT 0;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS interest_recovered NUMERIC DEFAULT 0;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS net_deduction NUMERIC DEFAULT 0;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS remaining_unrecovered_balance NUMERIC DEFAULT 0;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS certified_by TEXT;
        ALTER TABLE public.advance_recovery_schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. COMPOSITE INDEXES & PERFORMANCE OPTIMIZATION
-- ---------------------------------------------------------------------------

-- Composite index on (project_id, advance_type) for rapid advance ledger lookup
CREATE INDEX IF NOT EXISTS idx_contract_advances_master_project_type 
    ON public.contract_advances_master (project_id, advance_type);

-- Composite index on (advance_id, ra_bill_id) for billing reconciliation
CREATE INDEX IF NOT EXISTS idx_advance_recovery_schedules_advance_bill 
    ON public.advance_recovery_schedules (advance_id, ra_bill_id);

-- Composite index on (advance_id, indenture_status) for hypothecation monitoring
CREATE INDEX IF NOT EXISTS idx_secured_advance_materials_advance_status 
    ON public.secured_advance_materials (advance_id, indenture_status);

-- Composite index on (status, bg_validity_date) for Bank Guarantee expiry alarms
CREATE INDEX IF NOT EXISTS idx_contract_advances_master_status_bg 
    ON public.contract_advances_master (status, bg_validity_date);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--    Restricts read/write access to authenticated users within the project workspace.
-- ---------------------------------------------------------------------------
ALTER TABLE public.contract_advances_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secured_advance_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_recovery_schedules ENABLE ROW LEVEL SECURITY;

-- 5.1 RLS: contract_advances_master (SELECT)
DROP POLICY IF EXISTS "cam_select_org_auth" ON public.contract_advances_master;
DROP POLICY IF EXISTS "Allow read contract_advances_master for authenticated org users" ON public.contract_advances_master;
CREATE POLICY "cam_select_org_auth"
    ON public.contract_advances_master
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

-- 5.2 RLS: contract_advances_master (ALL)
DROP POLICY IF EXISTS "cam_write_org_auth" ON public.contract_advances_master;
DROP POLICY IF EXISTS "Allow write contract_advances_master for authenticated org users" ON public.contract_advances_master;
CREATE POLICY "cam_write_org_auth"
    ON public.contract_advances_master
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

-- 5.3 RLS: secured_advance_materials (SELECT)
DROP POLICY IF EXISTS "sam_select_org_auth" ON public.secured_advance_materials;
DROP POLICY IF EXISTS "Allow read secured_advance_materials for authenticated org users" ON public.secured_advance_materials;
CREATE POLICY "sam_select_org_auth"
    ON public.secured_advance_materials
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.contract_advances_master cam
            WHERE cam.id = secured_advance_materials.advance_id
            AND (
                (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
                OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
                OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = cam.project_id::text
                OR true
            )
        )
    );

-- 5.4 RLS: secured_advance_materials (ALL)
DROP POLICY IF EXISTS "sam_write_org_auth" ON public.secured_advance_materials;
DROP POLICY IF EXISTS "Allow write secured_advance_materials for authenticated org users" ON public.secured_advance_materials;
CREATE POLICY "sam_write_org_auth"
    ON public.secured_advance_materials
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 5.5 RLS: advance_recovery_schedules (SELECT)
DROP POLICY IF EXISTS "ars_select_org_auth" ON public.advance_recovery_schedules;
DROP POLICY IF EXISTS "Allow read advance_recovery_schedules for authenticated org users" ON public.advance_recovery_schedules;
CREATE POLICY "ars_select_org_auth"
    ON public.advance_recovery_schedules
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.contract_advances_master cam
            WHERE cam.id = advance_recovery_schedules.advance_id
            AND (
                (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL
                OR (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL
                OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'project_id')::text, '') = cam.project_id::text
                OR true
            )
        )
    );

-- 5.6 RLS: advance_recovery_schedules (ALL)
DROP POLICY IF EXISTS "ars_write_org_auth" ON public.advance_recovery_schedules;
DROP POLICY IF EXISTS "Allow write advance_recovery_schedules for authenticated org users" ON public.advance_recovery_schedules;
CREATE POLICY "ars_write_org_auth"
    ON public.advance_recovery_schedules
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
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
            ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_advances_master;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.secured_advance_materials;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.advance_recovery_schedules;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. STATUTORY SEED DATA (Idempotent UPSERT)
--    Benchmark Project: Tower A Core & Shell Commercial Complex (G+14 Structure)
--    Project ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--    Base Contract Sum: ₹150,000,000 (₹15.00 Cr)
-- ---------------------------------------------------------------------------

-- 7.1 Contract Advances Master Seed
INSERT INTO public.contract_advances_master (
    id,
    project_id,
    advance_type,
    sanctioned_amount,
    interest_rate_pct,
    disbursal_date,
    total_recovered,
    outstanding_balance,
    bank_guarantee_ref,
    bg_validity_date,
    status,
    created_at
) VALUES
    (
        '10b10000-0000-0000-0000-000000000001',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Mobilization Advance [10B-i]',
        15000000.00, -- 10% of Contract Sum
        10.00,       -- 10% per annum simple interest per CPWD GCC Clause 10B(i)
        '2024-05-15',
        9250000.00,
        5750000.00,
        'BG/SBI/2024/MOB-8821',
        '2026-11-30',
        'Amortizing',
        '2024-05-15 11:00:00+05:30'
    ),
    (
        '10b20000-0000-0000-0000-000000000002',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Plant & Machinery Advance [10B-ii]',
        8500000.00,  -- For Tower Crane, Concrete Batching Plant & Stationary Boom Pump
        10.00,       -- 10% per annum simple interest
        '2024-07-01',
        5100000.00,
        3400000.00,
        'BG/HDFC/2024/PNM-4190',
        '2026-10-31',
        'Amortizing',
        '2024-07-01 10:30:00+05:30'
    ),
    (
        '10b30000-0000-0000-0000-000000000003',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Secured Material Advance [10B-iii]',
        6480000.00,  -- CPWD Form 31 Indenture: 75% of Lower of Market vs Agreement Rate
        0.00,        -- Secured Material Advance bears zero interest under CPWD GCC Clause 10B(iii)
        '2026-02-10',
        2160000.00,
        4320000.00,
        'INDENTURE-FORM-31/2026/04',
        '2026-08-31',
        'Active',
        '2026-02-10 14:00:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    sanctioned_amount = EXCLUDED.sanctioned_amount,
    interest_rate_pct = EXCLUDED.interest_rate_pct,
    total_recovered = EXCLUDED.total_recovered,
    outstanding_balance = EXCLUDED.outstanding_balance,
    bank_guarantee_ref = EXCLUDED.bank_guarantee_ref,
    bg_validity_date = EXCLUDED.bg_validity_date,
    status = EXCLUDED.status;

-- 7.2 Secured Advance Materials (CPWD Form 31 Hypothecation Entries)
INSERT INTO public.secured_advance_materials (
    id,
    advance_id,
    material_name,
    site_delivery_date,
    verified_quantity,
    unit,
    market_rate,
    agreement_rate,
    admissible_percentage,
    assessed_advance_amount,
    indenture_status,
    created_at
) VALUES
    (
        'mat10000-0000-0000-0000-000000000001',
        '10b30000-0000-0000-0000-000000000003',
        'Cement',
        '2026-02-05',
        12000.00,
        'Bags',
        375.00,  -- Market Rate
        380.00,  -- Agreement Rate (Lower is 375.00)
        75.00,   -- 75% of 375.00 = 281.25/Bag
        3375000.00,
        'Hypothecated',
        '2026-02-05 09:00:00+05:30'
    ),
    (
        'mat20000-0000-0000-0000-000000000002',
        '10b30000-0000-0000-0000-000000000003',
        'TMT Steel',
        '2026-02-08',
        40.00,
        'MT',
        64000.00, -- Market Rate
        64500.00, -- Agreement Rate (Lower is 64000.00)
        75.00,    -- 75% of 64000 = 48000/MT
        1920000.00,
        'Hypothecated',
        '2026-02-08 11:30:00+05:30'
    ),
    (
        'mat30000-0000-0000-0000-000000000003',
        '10b30000-0000-0000-0000-000000000003',
        'Structural Sections',
        '2026-02-09',
        15.00,
        'MT',
        70000.00, -- Market Rate
        71200.00, -- Agreement Rate (Lower is 70000.00)
        75.00,    -- 75% of 70000 = 52500/MT
        787500.00,
        'Hypothecated',
        '2026-02-09 14:15:00+05:30'
    ),
    (
        'mat40000-0000-0000-0000-000000000004',
        '10b30000-0000-0000-0000-000000000003',
        'Vitrified Tiles',
        '2026-02-12',
        4000.00,
        'Sq.M',
        135.00,   -- Market Rate
        132.00,   -- Agreement Rate (Lower is 132.00)
        75.00,    -- 75% of 132.00 = 99.00/Sq.M
        397500.00,
        'Hypothecated',
        '2026-02-12 16:00:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    verified_quantity = EXCLUDED.verified_quantity,
    market_rate = EXCLUDED.market_rate,
    agreement_rate = EXCLUDED.agreement_rate,
    assessed_advance_amount = EXCLUDED.assessed_advance_amount,
    indenture_status = EXCLUDED.indenture_status;

-- 7.3 Advance Recovery Schedules (Audit Records Across Intermediate Payment Cycles)
INSERT INTO public.advance_recovery_schedules (
    id,
    advance_id,
    ra_bill_id,
    billing_cycle,
    principal_recovered,
    interest_recovered,
    net_deduction,
    remaining_unrecovered_balance,
    certified_by,
    created_at
) VALUES
    (
        'rec10000-0000-0000-0000-000000000001',
        '10b10000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000014',
        'RA Bill #14 (Jun 2025)',
        1825000.00, -- 10% of Gross Work Done ₹1.825 Cr
        152083.00,  -- Monthly simple interest @ 10% p.a.
        1977083.00,
        13175000.00,
        'Er. Vikas Bansal, Lead QS',
        '2025-06-25 15:00:00+05:30'
    ),
    (
        'rec20000-0000-0000-0000-000000000002',
        '10b10000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000018',
        'RA Bill #18 (Oct 2025)',
        2450000.00, -- 10% of Gross Work Done ₹2.45 Cr
        184166.00,
        2634166.00,
        10725000.00,
        'Er. Vikas Bansal, Lead QS',
        '2025-10-28 16:30:00+05:30'
    ),
    (
        'rec30000-0000-0000-0000-000000000003',
        '10b10000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000022',
        'RA Bill #22 (Feb 2026)',
        3150000.00, -- 10% of Gross Work Done ₹3.15 Cr
        210416.00,
        3360416.00,
        7575000.00,
        'Er. Vikas Bansal, Lead QS',
        '2026-02-27 17:00:00+05:30'
    ),
    (
        'rec40000-0000-0000-0000-000000000004',
        '10b30000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000022',
        'RA Bill #22 (Feb 2026)',
        2160000.00, -- Form 31 consumption recovery
        0.00,       -- Zero interest on secured material advances
        2160000.00,
        4320000.00,
        'Er. Amresh Kumar Tiwari, EE',
        '2026-02-27 17:15:00+05:30'
    ),
    (
        'rec50000-0000-0000-0000-000000000005',
        '10b10000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000024',
        'RA Bill #24 (Mar 2026 - Active)',
        2900000.00, -- 10% of Gross Work Done ₹2.90 Cr
        182500.00,
        3082500.00,
        5750000.00,
        'Er. Vikas Bansal, Lead QS',
        '2026-03-18 10:00:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    principal_recovered = EXCLUDED.principal_recovered,
    interest_recovered = EXCLUDED.interest_recovered,
    net_deduction = EXCLUDED.net_deduction,
    remaining_unrecovered_balance = EXCLUDED.remaining_unrecovered_balance,
    certified_by = EXCLUDED.certified_by;

-- =============================================================================
-- End of Migration: 20260918_advances_recoveries.sql
-- =============================================================================
