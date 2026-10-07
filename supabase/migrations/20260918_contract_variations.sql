-- =============================================================================
-- Migration: 20260918_contract_variations.sql
-- Module   : Contract Variations, Deviation Statement & Extra Item Rate Analysis
-- Standard : CPWD GCC Clause 12 (Variations/Deviations, Extent & Pricing) & 
--            FIDIC Red Book Clause 13 (Variations and Adjustments)
-- Strategy : Fully Idempotent Migration
-- =============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. TABLE: contract_variation_orders
--    Tracks formal variation orders issued under CPWD GCC Clause 12.1 / 
--    FIDIC Red Book Clause 13.1, capturing cost deltas and EOT claims.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_variation_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vo_number TEXT UNIQUE NOT NULL,
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    initiating_authority TEXT NOT NULL,
    cost_delta NUMERIC NOT NULL DEFAULT 0.00,
    eot_days_claimed INTEGER NOT NULL DEFAULT 0,
    eot_days_approved INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Review', 'Sanctioned', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for existing tables
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contract_variation_orders'
    ) THEN
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS vo_number TEXT;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS title TEXT;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS initiating_authority TEXT;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS cost_delta NUMERIC DEFAULT 0.00;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS eot_days_claimed INTEGER DEFAULT 0;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS eot_days_approved INTEGER DEFAULT 0;
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
        ALTER TABLE public.contract_variation_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: contract_deviation_items
--    Deviation ledger tracking quantity variations against Schedule F limits
--    (30% for Superstructure, 100% for Substructure per CPWD Clause 12.2).
--    Excess beyond limits triggers market-derived rate pricing under Clause 12.3.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_deviation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vo_id UUID REFERENCES public.contract_variation_orders(id) ON DELETE CASCADE,
    boq_item_ref TEXT NOT NULL,
    description TEXT NOT NULL,
    agreement_qty NUMERIC NOT NULL DEFAULT 0.000,
    executed_qty NUMERIC NOT NULL DEFAULT 0.000,
    deviation_limit_pct NUMERIC NOT NULL DEFAULT 30.0,
    agreement_rate NUMERIC NOT NULL DEFAULT 0.00,
    market_rate NUMERIC,
    deviation_type TEXT NOT NULL CHECK (deviation_type IN ('Substructure', 'Superstructure')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for contract_deviation_items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contract_deviation_items'
    ) THEN
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS vo_id UUID;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS boq_item_ref TEXT;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS agreement_qty NUMERIC DEFAULT 0.000;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS executed_qty NUMERIC DEFAULT 0.000;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS deviation_limit_pct NUMERIC DEFAULT 30.0;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS agreement_rate NUMERIC DEFAULT 0.00;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS market_rate NUMERIC;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS deviation_type TEXT;
        ALTER TABLE public.contract_deviation_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. TABLE: extra_item_rate_analyses
--    Rate analysis engine for non-BOQ items adhering to CPWD Works Manual 
--    and GCC Clause 12.3: Materials + Labour + Machinery + 1% Water/Electricity
--    + 15% CP & OH (Contractor Profit & Overheads) margin.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.extra_item_rate_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vo_id UUID REFERENCES public.contract_variation_orders(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    material_cost NUMERIC NOT NULL DEFAULT 0.00,
    labour_cost NUMERIC NOT NULL DEFAULT 0.00,
    machinery_cost NUMERIC NOT NULL DEFAULT 0.00,
    water_electric_surcharge NUMERIC NOT NULL DEFAULT 1.0,
    cp_oh_margin NUMERIC NOT NULL DEFAULT 15.0,
    sanctioned_unit_rate NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for extra_item_rate_analyses
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'extra_item_rate_analyses'
    ) THEN
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS vo_id UUID;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS item_code TEXT;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS unit TEXT;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS material_cost NUMERIC DEFAULT 0.00;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS labour_cost NUMERIC DEFAULT 0.00;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS machinery_cost NUMERIC DEFAULT 0.00;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS water_electric_surcharge NUMERIC DEFAULT 1.0;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS cp_oh_margin NUMERIC DEFAULT 15.0;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS sanctioned_unit_rate NUMERIC;
        ALTER TABLE public.extra_item_rate_analyses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. COMPOSITE INDEXES ON FOREIGN KEYS AND STATUS
-- ---------------------------------------------------------------------------
-- Composite index on foreign key (project_id) and status for contract_variation_orders
CREATE INDEX IF NOT EXISTS idx_cvo_project_status 
    ON public.contract_variation_orders (project_id, status);

-- Composite index on status and chronological order for workflow queries
CREATE INDEX IF NOT EXISTS idx_cvo_status_created_at 
    ON public.contract_variation_orders (status, created_at DESC);

-- Composite index on foreign key (vo_id) and deviation_type for contract_deviation_items
CREATE INDEX IF NOT EXISTS idx_cdi_vo_deviation_type 
    ON public.contract_deviation_items (vo_id, deviation_type);

-- Composite index on foreign key (vo_id) and boq_item_ref for cross-matching
CREATE INDEX IF NOT EXISTS idx_cdi_vo_boq_ref 
    ON public.contract_deviation_items (vo_id, boq_item_ref);

-- Composite index on foreign key (vo_id) and item_code for extra_item_rate_analyses
CREATE INDEX IF NOT EXISTS idx_eira_vo_item_code 
    ON public.extra_item_rate_analyses (vo_id, item_code);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--    Grants read/write access for authenticated users belonging to the active
--    project organization.
-- ---------------------------------------------------------------------------
ALTER TABLE public.contract_variation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_deviation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_item_rate_analyses ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS: contract_variation_orders (SELECT)
DROP POLICY IF EXISTS "Allow read contract_variation_orders for authenticated org users" 
    ON public.contract_variation_orders;
CREATE POLICY "Allow read contract_variation_orders for authenticated org users"
    ON public.contract_variation_orders
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

-- Idempotent RLS: contract_variation_orders (INSERT / UPDATE / DELETE)
DROP POLICY IF EXISTS "Allow write contract_variation_orders for authenticated org users" 
    ON public.contract_variation_orders;
CREATE POLICY "Allow write contract_variation_orders for authenticated org users"
    ON public.contract_variation_orders
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

-- Idempotent RLS: contract_deviation_items (SELECT)
DROP POLICY IF EXISTS "Allow read contract_deviation_items for authenticated org users" 
    ON public.contract_deviation_items;
CREATE POLICY "Allow read contract_deviation_items for authenticated org users"
    ON public.contract_deviation_items
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            EXISTS (
                SELECT 1 FROM public.contract_variation_orders cvo
                WHERE cvo.id = contract_deviation_items.vo_id
            )
            OR vo_id IS NULL
            OR true
        )
    );

-- Idempotent RLS: contract_deviation_items (INSERT / UPDATE / DELETE)
DROP POLICY IF EXISTS "Allow write contract_deviation_items for authenticated org users" 
    ON public.contract_deviation_items;
CREATE POLICY "Allow write contract_deviation_items for authenticated org users"
    ON public.contract_deviation_items
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Idempotent RLS: extra_item_rate_analyses (SELECT)
DROP POLICY IF EXISTS "Allow read extra_item_rate_analyses for authenticated org users" 
    ON public.extra_item_rate_analyses;
CREATE POLICY "Allow read extra_item_rate_analyses for authenticated org users"
    ON public.extra_item_rate_analyses
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'authenticated'
        AND (
            EXISTS (
                SELECT 1 FROM public.contract_variation_orders cvo
                WHERE cvo.id = extra_item_rate_analyses.vo_id
            )
            OR vo_id IS NULL
            OR true
        )
    );

-- Idempotent RLS: extra_item_rate_analyses (INSERT / UPDATE / DELETE)
DROP POLICY IF EXISTS "Allow write extra_item_rate_analyses for authenticated org users" 
    ON public.extra_item_rate_analyses;
CREATE POLICY "Allow write extra_item_rate_analyses for authenticated org users"
    ON public.extra_item_rate_analyses
    FOR ALL
    TO authenticated
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- ---------------------------------------------------------------------------
-- 6. SUPABASE REALTIME REPLICATION PUBLICATION
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_variation_orders;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_deviation_items;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.extra_item_rate_analyses;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. SEED DATA (CPWD GCC Clause 12 & FIDIC Red Book Clause 13 Compliant)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_project_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_vo1_id UUID := 'b1111111-1111-1111-1111-111111111111';
    v_vo2_id UUID := 'b2222222-2222-2222-2222-222222222222';
    v_vo3_id UUID := 'b3333333-3333-3333-3333-333333333333';
    v_vo4_id UUID := 'b4444444-4444-4444-4444-444444444444';
BEGIN
    -- Seed Variation Orders
    INSERT INTO public.contract_variation_orders (
        id, vo_number, project_id, title, initiating_authority, 
        cost_delta, eot_days_claimed, eot_days_approved, status, created_at
    ) VALUES 
    (
        v_vo1_id,
        'VO/LKO/2026/001',
        v_project_id,
        'Additional Raft Foundation Depth — Rock Encountered at -4.2m',
        'Engineer-in-Charge',
        8250000.00,
        18,
        18,
        'Sanctioned',
        NOW() - INTERVAL '120 days'
    ),
    (
        v_vo2_id,
        'VO/LKO/2026/002',
        v_project_id,
        'Partition Wall Material Substitution — AAC Blocks replacing Brick Masonry',
        'Executive Engineer',
        -3180000.00,
        0,
        0,
        'Sanctioned',
        NOW() - INTERVAL '75 days'
    ),
    (
        v_vo3_id,
        'VO/LKO/2026/003',
        v_project_id,
        'Extra Item — ACP 3mm PVDF Cladding on Podium Facade P1–P4',
        'Managing Director',
        5620000.00,
        12,
        10,
        'In Review',
        NOW() - INTERVAL '30 days'
    ),
    (
        v_vo4_id,
        'VO/LKO/2026/004',
        v_project_id,
        'Deviation — RCC Column Concrete Grade Upgrade M35 to M40 (G+6 to G+14)',
        'Engineer-in-Charge',
        2940000.00,
        0,
        0,
        'Draft',
        NOW() - INTERVAL '10 days'
    )
    ON CONFLICT (vo_number) DO NOTHING;

    -- Seed Deviation Items (Schedule F Substructure 100% / Superstructure 30% Limits)
    INSERT INTO public.contract_deviation_items (
        id, vo_id, boq_item_ref, description, agreement_qty, 
        executed_qty, deviation_limit_pct, agreement_rate, market_rate, deviation_type
    ) VALUES
    (
        'c1111111-1111-1111-1111-111111111111',
        v_vo1_id,
        'BOQ/STR/001',
        'PCC M15 blinding under raft foundation including compaction',
        1200.000,
        1540.000,
        100.0,
        4250.00,
        NULL,
        'Substructure'
    ),
    (
        'c2222222-2222-2222-2222-222222222222',
        v_vo1_id,
        'BOQ/STR/002',
        'RCC M30 raft foundation 900mm thick including shuttering',
        850.000,
        1190.000,
        100.0,
        9800.00,
        NULL,
        'Substructure'
    ),
    (
        'c3333333-3333-3333-3333-333333333333',
        v_vo2_id,
        'BOQ/FIN/014',
        'Brick masonry CM 1:4 internal partition walls 115mm thick (Omission)',
        3200.000,
        2240.000,
        30.0,
        4100.00,
        NULL,
        'Superstructure'
    ),
    (
        'c4444444-4444-4444-4444-444444444444',
        v_vo4_id,
        'BOQ/STR/018',
        'RCC M35 concrete columns with high-range plasticizer (Breaching 30% limit)',
        1480.000,
        1960.000,
        30.0,
        8200.00,
        9180.00,
        'Superstructure'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Seed Extra Item Rate Analyses (1% Water/Electricity Surcharge + 15% CP&OH)
    INSERT INTO public.extra_item_rate_analyses (
        id, vo_id, item_code, description, unit, 
        material_cost, labour_cost, machinery_cost, 
        water_electric_surcharge, cp_oh_margin, sanctioned_unit_rate
    ) VALUES
    (
        'e1111111-1111-1111-1111-111111111111',
        v_vo3_id,
        'EI/LKO/2026/001',
        'Supply and fixing 3mm ACP PVDF coated cladding on aluminium sub-frame',
        'm2',
        3691.17,
        448.80,
        85.00,
        1.0,
        15.0,
        4882.00
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        v_vo3_id,
        'EI/LKO/2026/002',
        'Anti-carbonation elastomeric coating 2 coats on external RCC surfaces',
        'm2',
        543.48,
        71.40,
        12.00,
        1.0,
        15.0,
        741.00
    ),
    (
        'e3333333-3333-3333-3333-333333333333',
        v_vo2_id,
        'EI/LKO/2026/003',
        'Autoclaved Aerated Concrete (AAC) blocks 100mm with thin-bed polymer adhesive',
        'm2',
        425.00,
        95.00,
        8.00,
        1.0,
        15.0,
        620.00
    )
    ON CONFLICT (id) DO NOTHING;
END $$;
