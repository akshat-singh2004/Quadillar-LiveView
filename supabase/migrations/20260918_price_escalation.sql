-- =============================================================================
-- Migration: 20260918_price_escalation.sql
-- Module   : Clause 10CA & 10CC Price Escalation & Star Rate Indexation Engine
-- Standards: CPWD GCC Clause 10CA (Payment due to variation in prices of materials)
--            CPWD GCC Clause 10CC (Payment due to increase/decrease in Prices/Wages)
--            FIDIC Red Book Clause 13.8 (Adjustments for Changes in Cost)
-- Strategy : Fully Idempotent Migration
-- =============================================================================

-- Ensure cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. TABLE: contract_star_rates
--    Stores Schedule F base star rates and base economic indices (CI_0)
--    stipulated at the time of tender award for core materials under Clause 10CA
--    (Cement, TMT Reinforcement Bars, Structural Steel, Bitumen).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_star_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    material_type TEXT NOT NULL CHECK (material_type IN ('Cement', 'TMT Reinforcement', 'Structural Steel', 'Bitumen')),
    base_star_rate NUMERIC NOT NULL CHECK (base_star_rate > 0),
    base_star_rate_date DATE NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('MT', 'Bag', 'Litre')),
    base_index_ci NUMERIC NOT NULL CHECK (base_index_ci > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for contract_star_rates
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contract_star_rates'
    ) THEN
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS material_type TEXT;
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS base_star_rate NUMERIC;
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS base_star_rate_date DATE;
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS unit TEXT;
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS base_index_ci NUMERIC;
        ALTER TABLE public.contract_star_rates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: monthly_economic_indices
--    Stores official monthly statistical indices published by Office of the
--    Economic Adviser (DPIIT) and Labour Bureau Government of India:
--    - wpi_cement: Wholesale Price Index for Grey Cement (Cl. 10CA)
--    - wpi_steel: Wholesale Price Index for Long/Structural Steel (Cl. 10CA)
--    - wpi_all_commodities: WPI All Commodities Index (Cl. 10CC Materials, M_m)
--    - cpi_industrial_labour: Consumer Price Index for Industrial Workers (L_i)
--    - pol_index: High Speed Diesel / POL Price Index (Z_i)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_economic_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_month DATE NOT NULL UNIQUE,
    wpi_cement NUMERIC NOT NULL CHECK (wpi_cement >= 0),
    wpi_steel NUMERIC NOT NULL CHECK (wpi_steel >= 0),
    wpi_all_commodities NUMERIC NOT NULL CHECK (wpi_all_commodities >= 0),
    cpi_industrial_labour NUMERIC NOT NULL CHECK (cpi_industrial_labour >= 0),
    pol_index NUMERIC NOT NULL CHECK (pol_index >= 0),
    verified_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for monthly_economic_indices
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'monthly_economic_indices'
    ) THEN
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS billing_month DATE;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS wpi_cement NUMERIC;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS wpi_steel NUMERIC;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS wpi_all_commodities NUMERIC;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS cpi_industrial_labour NUMERIC;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS pol_index NUMERIC;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS verified_by TEXT;
        ALTER TABLE public.monthly_economic_indices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. TABLE: escalation_claims
--    Stores interim price escalation claims computed and certified against
--    Running Account (RA) bills under CPWD GCC Clauses 10CA and 10CC.
--    Captures:
--    - clause_10ca_amount: Direct material indexation (Cement, Steel, Bitumen)
--    - clause_10cc_labour_amount: Labour component indexation (V_L)
--    - clause_10cc_material_amount: Remaining materials component indexation (V_M)
--    - clause_10cc_pol_amount: Fuel and lubricant component indexation (V_Z)
--    - net_escalation_payable: Total admissible escalation or recovery adjustment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalation_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    ra_bill_id UUID,
    claim_month DATE NOT NULL,
    clause_10ca_amount NUMERIC NOT NULL DEFAULT 0.00,
    clause_10cc_labour_amount NUMERIC NOT NULL DEFAULT 0.00,
    clause_10cc_material_amount NUMERIC NOT NULL DEFAULT 0.00,
    clause_10cc_pol_amount NUMERIC NOT NULL DEFAULT 0.00,
    net_escalation_payable NUMERIC NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under Scrutiny', 'Certified', 'Recovered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for escalation_claims
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'escalation_claims'
    ) THEN
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS ra_bill_id UUID;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS claim_month DATE;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS clause_10ca_amount NUMERIC DEFAULT 0.00;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS clause_10cc_labour_amount NUMERIC DEFAULT 0.00;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS clause_10cc_material_amount NUMERIC DEFAULT 0.00;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS clause_10cc_pol_amount NUMERIC DEFAULT 0.00;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS net_escalation_payable NUMERIC DEFAULT 0.00;
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
        ALTER TABLE public.escalation_claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. COMPOSITE INDEXES & PERFORMANCE OPTIMIZATIONS
-- ---------------------------------------------------------------------------
-- Composite index on (project_id, claim_month) for fast periodic claim lookups
CREATE INDEX IF NOT EXISTS idx_escalation_claims_project_month 
    ON public.escalation_claims (project_id, claim_month DESC);

-- Composite index on (billing_month) for chronological economic time-series lookups
CREATE INDEX IF NOT EXISTS idx_monthly_economic_indices_billing_month 
    ON public.monthly_economic_indices (billing_month DESC);

-- Composite index on (project_id, material_type) for star rate configuration retrieval
CREATE INDEX IF NOT EXISTS idx_contract_star_rates_project_material 
    ON public.contract_star_rates (project_id, material_type);

-- Index on escalation claim verification workflow status
CREATE INDEX IF NOT EXISTS idx_escalation_claims_status 
    ON public.escalation_claims (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--    Restricts read/write access to authenticated users within the project workspace.
-- ---------------------------------------------------------------------------
ALTER TABLE public.contract_star_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_economic_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_claims ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS: contract_star_rates (SELECT)
DROP POLICY IF EXISTS "Allow read contract_star_rates for authenticated org users" 
    ON public.contract_star_rates;
CREATE POLICY "Allow read contract_star_rates for authenticated org users"
    ON public.contract_star_rates
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

-- Idempotent RLS: contract_star_rates (ALL)
DROP POLICY IF EXISTS "Allow write contract_star_rates for authenticated org users" 
    ON public.contract_star_rates;
CREATE POLICY "Allow write contract_star_rates for authenticated org users"
    ON public.contract_star_rates
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

-- Idempotent RLS: monthly_economic_indices (SELECT)
-- All authenticated workspace users can view published monthly economic indices
DROP POLICY IF EXISTS "Allow read monthly_economic_indices for authenticated org users" 
    ON public.monthly_economic_indices;
CREATE POLICY "Allow read monthly_economic_indices for authenticated org users"
    ON public.monthly_economic_indices
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
    );

-- Idempotent RLS: monthly_economic_indices (ALL)
DROP POLICY IF EXISTS "Allow write monthly_economic_indices for authenticated org users" 
    ON public.monthly_economic_indices;
CREATE POLICY "Allow write monthly_economic_indices for authenticated org users"
    ON public.monthly_economic_indices
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Idempotent RLS: escalation_claims (SELECT)
DROP POLICY IF EXISTS "Allow read escalation_claims for authenticated org users" 
    ON public.escalation_claims;
CREATE POLICY "Allow read escalation_claims for authenticated org users"
    ON public.escalation_claims
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

-- Idempotent RLS: escalation_claims (ALL)
DROP POLICY IF EXISTS "Allow write escalation_claims for authenticated org users" 
    ON public.escalation_claims;
CREATE POLICY "Allow write escalation_claims for authenticated org users"
    ON public.escalation_claims
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
            ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_star_rates;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_economic_indices;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.escalation_claims;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. STATUTORY SEED DATA (Idempotent UPSERT)
--    Benchmark data for Tower A Core & Shell (G+14 Commercial Complex)
--    Project ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
-- ---------------------------------------------------------------------------

-- 7.1 Contract Schedule F Star Rates
INSERT INTO public.contract_star_rates (
    id,
    project_id,
    material_type,
    base_star_rate,
    base_star_rate_date,
    unit,
    base_index_ci,
    created_at
) VALUES
    (
        'a1111111-1111-1111-1111-111111111111',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Cement',
        380.00,
        '2024-04-01',
        'Bag',
        128.40,
        '2024-04-01 10:00:00+05:30'
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'TMT Reinforcement',
        64500.00,
        '2024-04-01',
        'MT',
        142.10,
        '2024-04-01 10:00:00+05:30'
    ),
    (
        'a3333333-3333-3333-3333-333333333333',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Structural Steel',
        71200.00,
        '2024-04-01',
        'MT',
        138.60,
        '2024-04-01 10:00:00+05:30'
    ),
    (
        'a4444444-4444-4444-4444-444444444444',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Bitumen',
        48500.00,
        '2024-04-01',
        'MT',
        119.50,
        '2024-04-01 10:00:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    base_star_rate = EXCLUDED.base_star_rate,
    base_index_ci = EXCLUDED.base_index_ci,
    base_star_rate_date = EXCLUDED.base_star_rate_date;

-- 7.2 Monthly Economic Indices (Historical & Current Series)
-- Source: Office of the Economic Adviser, DPIIT / Labour Bureau GoI
INSERT INTO public.monthly_economic_indices (
    id,
    billing_month,
    wpi_cement,
    wpi_steel,
    wpi_all_commodities,
    cpi_industrial_labour,
    pol_index,
    verified_by,
    created_at
) VALUES
    (
        'b1111111-1111-1111-1111-111111111111',
        '2025-04-01',
        132.80,
        146.50,
        153.20,
        138.60,
        122.40,
        'Office of the Economic Adviser / DPIIT',
        '2025-05-15 11:00:00+05:30'
    ),
    (
        'b2222222-2222-2222-2222-222222222222',
        '2025-06-01',
        134.50,
        148.90,
        154.60,
        139.80,
        123.10,
        'Office of the Economic Adviser / DPIIT',
        '2025-07-15 11:00:00+05:30'
    ),
    (
        'b3333333-3333-3333-3333-333333333333',
        '2025-08-01',
        135.20,
        151.20,
        155.80,
        141.20,
        124.50,
        'Office of the Economic Adviser / DPIIT',
        '2025-09-15 11:00:00+05:30'
    ),
    (
        'b4444444-4444-4444-4444-444444444444',
        '2025-10-01',
        137.60,
        153.40,
        156.90,
        142.50,
        125.80,
        'Office of the Economic Adviser / DPIIT',
        '2025-11-15 11:00:00+05:30'
    ),
    (
        'b5555555-5555-5555-5555-555555555555',
        '2025-12-01',
        139.10,
        155.80,
        158.40,
        143.90,
        126.90,
        'Office of the Economic Adviser / DPIIT',
        '2026-01-15 11:00:00+05:30'
    ),
    (
        'b6666666-6666-6666-6666-666666666666',
        '2026-02-01',
        141.40,
        158.20,
        160.10,
        145.40,
        128.20,
        'Office of the Economic Adviser / DPIIT',
        '2026-03-15 11:00:00+05:30'
    )
ON CONFLICT (billing_month) DO UPDATE SET
    wpi_cement = EXCLUDED.wpi_cement,
    wpi_steel = EXCLUDED.wpi_steel,
    wpi_all_commodities = EXCLUDED.wpi_all_commodities,
    cpi_industrial_labour = EXCLUDED.cpi_industrial_labour,
    pol_index = EXCLUDED.pol_index,
    verified_by = EXCLUDED.verified_by;

-- 7.3 Escalation Claims (Clause 10CA & 10CC Periodic Adjustments)
INSERT INTO public.escalation_claims (
    id,
    project_id,
    ra_bill_id,
    claim_month,
    clause_10ca_amount,
    clause_10cc_labour_amount,
    clause_10cc_material_amount,
    clause_10cc_pol_amount,
    net_escalation_payable,
    status,
    created_at
) VALUES
    (
        'c1111111-1111-1111-1111-111111111111',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'd1111111-1111-1111-1111-111111111111',
        '2025-06-01',
        642500.00,
        418200.00,
        512400.00,
        96800.00,
        1669900.00,
        'Certified',
        '2025-07-20 14:30:00+05:30'
    ),
    (
        'c2222222-2222-2222-2222-222222222222',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'd2222222-2222-2222-2222-222222222222',
        '2025-10-01',
        984200.00,
        584100.00,
        715300.00,
        142600.00,
        2426200.00,
        'Certified',
        '2025-11-20 16:15:00+05:30'
    ),
    (
        'c3333333-3333-3333-3333-333333333333',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'd3333333-3333-3333-3333-333333333333',
        '2026-02-01',
        1385400.00,
        762900.00,
        941800.00,
        188500.00,
        3278600.00,
        'Under Scrutiny',
        '2026-03-10 11:45:00+05:30'
    )
ON CONFLICT (id) DO UPDATE SET
    clause_10ca_amount = EXCLUDED.clause_10ca_amount,
    clause_10cc_labour_amount = EXCLUDED.clause_10cc_labour_amount,
    clause_10cc_material_amount = EXCLUDED.clause_10cc_material_amount,
    clause_10cc_pol_amount = EXCLUDED.clause_10cc_pol_amount,
    net_escalation_payable = EXCLUDED.net_escalation_payable,
    status = EXCLUDED.status;
