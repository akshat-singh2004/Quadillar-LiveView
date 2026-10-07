-- =============================================================================
-- Migration: 20260918_final_bill_retention.sql
-- Module   : Final Bill Settlement, No-Claims Discharge & Retention Money Release Engine
-- Standards: CPWD GCC Clause 8B (Completion Certificate & Final Bill Submission)
--            CPWD GCC Clause 9 (Payment of Final Bill & 50/50 Retention Release Rules)
--            CPWD Form 65 (Final Bill for Contractors - Executed vs Agreed Schedule)
--            FIDIC Red Book Clause 14.9 (Payment of Retention Money: 50% TOC, 50% DLP)
--            FIDIC Red Book Clause 14.11 (Application for Final Payment Certificate)
--            FIDIC Red Book Clause 14.12 (Discharge & Written No-Claims Certificate)
-- Strategy : Fully Idempotent Migration
-- =============================================================================

-- Ensure cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0. PRE-FLIGHT COMPATIBILITY & TYPE ALIGNMENT
--    Ensures public.final_bill_settlements uses UUID primary/foreign keys
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'final_bill_settlements' 
          AND column_name = 'id' 
          AND data_type = 'text'
    ) THEN
        BEGIN
            ALTER TABLE public.retention_release_ledger 
                DROP CONSTRAINT IF EXISTS retention_release_ledger_final_bill_settlement_id_fkey;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            ALTER TABLE public.final_bill_settlements 
                ALTER COLUMN id TYPE UUID USING id::uuid;
            ALTER TABLE public.final_bill_settlements 
                ALTER COLUMN id SET DEFAULT gen_random_uuid();
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'final_bill_settlements' 
          AND column_name = 'project_id' 
          AND data_type = 'text'
    ) THEN
        BEGIN
            ALTER TABLE public.final_bill_settlements 
                ALTER COLUMN project_id TYPE UUID USING project_id::uuid;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. TABLE: final_bill_settlements
--    Terminal financial settlement ledger pursuant to CPWD GCC Clause 8B/9,
--    CPWD Form 65, and FIDIC Red Book Clause 14.11.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.final_bill_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    final_bill_no TEXT NOT NULL UNIQUE,
    gross_contract_sum NUMERIC NOT NULL CHECK (gross_contract_sum > 0),
    gross_executed_value NUMERIC NOT NULL CHECK (gross_executed_value >= 0),
    cumulative_previous_ra_gross NUMERIC NOT NULL CHECK (cumulative_previous_ra_gross >= 0),
    net_final_bill_gross NUMERIC NOT NULL,
    total_retention_held NUMERIC NOT NULL CHECK (total_retention_held >= 0),
    retention_released_stage_1 NUMERIC NOT NULL DEFAULT 0 CHECK (retention_released_stage_1 >= 0),
    retention_held_dlp_stage_2 NUMERIC NOT NULL DEFAULT 0 CHECK (retention_held_dlp_stage_2 >= 0),
    statutory_tax_deductions_total NUMERIC NOT NULL DEFAULT 0 CHECK (statutory_tax_deductions_total >= 0),
    net_final_payable NUMERIC NOT NULL,
    no_claims_attested BOOLEAN NOT NULL DEFAULT false,
    audit_clearance_status TEXT NOT NULL DEFAULT 'Pending Audit' CHECK (
        audit_clearance_status IN (
            'Pending Audit',
            'Scrutinized',
            'Certified',
            'Settled'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for final_bill_settlements
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'final_bill_settlements'
    ) THEN
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS final_bill_no TEXT;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS gross_contract_sum NUMERIC;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS gross_executed_value NUMERIC;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS cumulative_previous_ra_gross NUMERIC;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS net_final_bill_gross NUMERIC;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS total_retention_held NUMERIC;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS retention_released_stage_1 NUMERIC DEFAULT 0;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS retention_held_dlp_stage_2 NUMERIC DEFAULT 0;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS statutory_tax_deductions_total NUMERIC DEFAULT 0;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS net_final_payable NUMERIC;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS no_claims_attested BOOLEAN DEFAULT false;
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS audit_clearance_status TEXT DEFAULT 'Pending Audit';
        ALTER TABLE public.final_bill_settlements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

        -- Synchronize final_bill_no with legacy final_bill_number if present
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'final_bill_settlements' AND column_name = 'final_bill_number'
        ) THEN
            UPDATE public.final_bill_settlements 
            SET final_bill_no = final_bill_number 
            WHERE final_bill_no IS NULL AND final_bill_number IS NOT NULL;
        END IF;

        -- Ensure unique constraint on final_bill_no
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_final_bill_settlements_no'
        ) THEN
            BEGIN
                ALTER TABLE public.final_bill_settlements ADD CONSTRAINT uq_final_bill_settlements_no UNIQUE (final_bill_no);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: retention_release_ledgers
--    Staged Retention Money Release ledger governed by CPWD GCC Clause 9
--    and FIDIC Red Book Clause 14.9:
--    - Tranche 1: 50% released on Taking-Over Certificate (TOC) / Completion
--    - Tranche 2: 50% released after Defects Liability Period (DLP) clearance
--      or substituted with Bank Guarantee (BG).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retention_release_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_bill_id UUID NOT NULL REFERENCES public.final_bill_settlements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    release_tranche TEXT NOT NULL CHECK (
        release_tranche IN (
            'Tranche 1 [50% at TOC / Completion]',
            'Tranche 2 [50% after DLP Clearance]'
        )
    ),
    retention_mode TEXT NOT NULL CHECK (
        retention_mode IN (
            'Cash Retained',
            'Bank Guarantee Substitution'
        )
    ),
    bg_guarantee_ref TEXT,
    bg_validity_date DATE,
    eligible_release_amount NUMERIC NOT NULL CHECK (eligible_release_amount >= 0),
    withheld_for_unrectified_defects NUMERIC NOT NULL DEFAULT 0 CHECK (withheld_for_unrectified_defects >= 0),
    net_released_amount NUMERIC NOT NULL CHECK (net_released_amount >= 0),
    release_sanction_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Withheld' CHECK (
        status IN (
            'Withheld',
            'Sanctioned',
            'Disbursed'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for retention_release_ledgers
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retention_release_ledgers'
    ) THEN
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS final_bill_id UUID;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS release_tranche TEXT;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS retention_mode TEXT;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS bg_guarantee_ref TEXT;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS bg_validity_date DATE;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS eligible_release_amount NUMERIC;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS withheld_for_unrectified_defects NUMERIC DEFAULT 0;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS net_released_amount NUMERIC;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS release_sanction_date DATE;
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Withheld';
        ALTER TABLE public.retention_release_ledgers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. TABLE: statutory_no_claims_undertakings
--    Statutory Discharge & No Further Claims Undertaking pursuant to
--    CPWD Works Accounts Manual and FIDIC Red Book Clause 14.12.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_no_claims_undertakings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_bill_id UUID NOT NULL REFERENCES public.final_bill_settlements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    contractor_legal_name TEXT NOT NULL,
    authorized_signatory_name TEXT NOT NULL,
    signatory_designation TEXT NOT NULL,
    final_agreed_settlement_sum NUMERIC NOT NULL CHECK (final_agreed_settlement_sum >= 0),
    no_further_claims_declaration TEXT NOT NULL,
    discharge_condition_precedent_met BOOLEAN NOT NULL DEFAULT true,
    digital_signature_hash TEXT NOT NULL,
    attestation_ip_address TEXT NOT NULL,
    attested_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column check for statutory_no_claims_undertakings
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'statutory_no_claims_undertakings'
    ) THEN
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS final_bill_id UUID;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS contractor_legal_name TEXT;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS authorized_signatory_name TEXT;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS signatory_designation TEXT;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS final_agreed_settlement_sum NUMERIC;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS no_further_claims_declaration TEXT;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS discharge_condition_precedent_met BOOLEAN DEFAULT true;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS digital_signature_hash TEXT;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS attestation_ip_address TEXT;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS attested_at TIMESTAMPTZ;
        ALTER TABLE public.statutory_no_claims_undertakings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. COMPOSITE INDEXES & QUERY ACCELERATION
-- ---------------------------------------------------------------------------

-- Composite index on (project_id, final_bill_no) for final bill identification
CREATE INDEX IF NOT EXISTS idx_final_bill_settlements_proj_no 
    ON public.final_bill_settlements (project_id, final_bill_no);

-- Composite index on (final_bill_id, release_tranche) for tranche-level queries
CREATE INDEX IF NOT EXISTS idx_retention_release_ledgers_fb_tranche 
    ON public.retention_release_ledgers (final_bill_id, release_tranche);

-- Composite index on (project_id, status) for retention release tracking
CREATE INDEX IF NOT EXISTS idx_retention_release_ledgers_proj_status 
    ON public.retention_release_ledgers (project_id, status);

-- Composite index on (project_id, final_bill_id) for no-claims undertaking lookups
CREATE INDEX IF NOT EXISTS idx_statutory_no_claims_proj_fb 
    ON public.statutory_no_claims_undertakings (project_id, final_bill_id);

-- Composite index on (project_id, audit_clearance_status) for bill audit filtering
CREATE INDEX IF NOT EXISTS idx_final_bill_settlements_proj_status 
    ON public.final_bill_settlements (project_id, audit_clearance_status);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--    Restricts read/write access to authenticated users within the project organization.
-- ---------------------------------------------------------------------------
ALTER TABLE public.final_bill_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_release_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_no_claims_undertakings ENABLE ROW LEVEL SECURITY;

-- 5.1 RLS: final_bill_settlements (SELECT)
DROP POLICY IF EXISTS "fbs_select_org_auth" ON public.final_bill_settlements;
DROP POLICY IF EXISTS "Allow read final_bill_settlements for authenticated org users" ON public.final_bill_settlements;
CREATE POLICY "fbs_select_org_auth"
    ON public.final_bill_settlements
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

-- 5.2 RLS: final_bill_settlements (ALL)
DROP POLICY IF EXISTS "fbs_write_org_auth" ON public.final_bill_settlements;
DROP POLICY IF EXISTS "Allow write final_bill_settlements for authenticated org users" ON public.final_bill_settlements;
CREATE POLICY "fbs_write_org_auth"
    ON public.final_bill_settlements
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

-- 5.3 RLS: retention_release_ledgers (SELECT)
DROP POLICY IF EXISTS "rrl_select_org_auth" ON public.retention_release_ledgers;
DROP POLICY IF EXISTS "Allow read retention_release_ledgers for authenticated org users" ON public.retention_release_ledgers;
CREATE POLICY "rrl_select_org_auth"
    ON public.retention_release_ledgers
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

-- 5.4 RLS: retention_release_ledgers (ALL)
DROP POLICY IF EXISTS "rrl_write_org_auth" ON public.retention_release_ledgers;
DROP POLICY IF EXISTS "Allow write retention_release_ledgers for authenticated org users" ON public.retention_release_ledgers;
CREATE POLICY "rrl_write_org_auth"
    ON public.retention_release_ledgers
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

-- 5.5 RLS: statutory_no_claims_undertakings (SELECT)
DROP POLICY IF EXISTS "sncu_select_org_auth" ON public.statutory_no_claims_undertakings;
DROP POLICY IF EXISTS "Allow read statutory_no_claims_undertakings for authenticated org users" ON public.statutory_no_claims_undertakings;
CREATE POLICY "sncu_select_org_auth"
    ON public.statutory_no_claims_undertakings
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

-- 5.6 RLS: statutory_no_claims_undertakings (ALL)
DROP POLICY IF EXISTS "sncu_write_org_auth" ON public.statutory_no_claims_undertakings;
DROP POLICY IF EXISTS "Allow write statutory_no_claims_undertakings for authenticated org users" ON public.statutory_no_claims_undertakings;
CREATE POLICY "sncu_write_org_auth"
    ON public.statutory_no_claims_undertakings
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
            ALTER PUBLICATION supabase_realtime ADD TABLE public.final_bill_settlements;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.retention_release_ledgers;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.statutory_no_claims_undertakings;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. STATUTORY BENCHMARK SEED DATA (Idempotent UPSERT)
--    Benchmark Project: Tower A Core & Shell Commercial Complex (G+14 Structure)
--    Project ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--    Base Contract Sum: ₹150,000,000.00 (₹15.00 Cr)
--    Gross Executed Value: ₹154,850,000.00 (₹15.485 Cr with +3.23% authorized deviations)
--    Previous Certified RA Bills: ₹146,500,000.00 (RA Bills #1 through #24)
--    Net Final Bill Gross: ₹8,350,000.00
--    Retention Money: 5% Statutory = ₹7,742,500.00 (Stage 1: ₹38.71L, Stage 2: ₹38.71L)
-- ---------------------------------------------------------------------------

-- 7.1 Final Bill Settlement Record
INSERT INTO public.final_bill_settlements (
    id,
    project_id,
    final_bill_no,
    gross_contract_sum,
    gross_executed_value,
    cumulative_previous_ra_gross,
    net_final_bill_gross,
    total_retention_held,
    retention_released_stage_1,
    retention_held_dlp_stage_2,
    statutory_tax_deductions_total,
    net_final_payable,
    no_claims_attested,
    audit_clearance_status,
    created_at
) VALUES (
    'fb100000-0000-0000-0000-000000000001',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'FB/2026/SPD-II/001',
    150000000.00,
    154850000.00,
    146500000.00,
    8350000.00,
    7742500.00,
    3871250.00,
    3871250.00,
    668000.00,
    11553250.00,
    true,
    'Certified',
    '2026-08-15T11:30:00+05:30'
)
ON CONFLICT (final_bill_no) DO UPDATE SET
    gross_contract_sum = EXCLUDED.gross_contract_sum,
    gross_executed_value = EXCLUDED.gross_executed_value,
    cumulative_previous_ra_gross = EXCLUDED.cumulative_previous_ra_gross,
    net_final_bill_gross = EXCLUDED.net_final_bill_gross,
    total_retention_held = EXCLUDED.total_retention_held,
    retention_released_stage_1 = EXCLUDED.retention_released_stage_1,
    retention_held_dlp_stage_2 = EXCLUDED.retention_held_dlp_stage_2,
    statutory_tax_deductions_total = EXCLUDED.statutory_tax_deductions_total,
    net_final_payable = EXCLUDED.net_final_payable,
    no_claims_attested = EXCLUDED.no_claims_attested,
    audit_clearance_status = EXCLUDED.audit_clearance_status;

-- 7.2 Staged Retention Release Records (Tranche 1 & Tranche 2)
INSERT INTO public.retention_release_ledgers (
    id,
    final_bill_id,
    project_id,
    release_tranche,
    retention_mode,
    bg_guarantee_ref,
    bg_validity_date,
    eligible_release_amount,
    withheld_for_unrectified_defects,
    net_released_amount,
    release_sanction_date,
    status,
    created_at
) VALUES 
(
    'rrl10000-0000-0000-0000-000000000001',
    'fb100000-0000-0000-0000-000000000001',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Tranche 1 [50% at TOC / Completion]',
    'Cash Retained',
    NULL,
    NULL,
    3871250.00,
    0.00,
    3871250.00,
    '2026-08-15',
    'Sanctioned',
    '2026-08-15T12:00:00+05:30'
),
(
    'rrl20000-0000-0000-0000-000000000002',
    'fb100000-0000-0000-0000-000000000001',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Tranche 2 [50% after DLP Clearance]',
    'Bank Guarantee Substitution',
    'BG/SBI/2026/RET-0981',
    '2027-08-15',
    3871250.00,
    350000.00,
    3521250.00,
    '2026-08-20',
    'Withheld',
    '2026-08-20T14:15:00+05:30'
)
ON CONFLICT (id) DO UPDATE SET
    eligible_release_amount = EXCLUDED.eligible_release_amount,
    withheld_for_unrectified_defects = EXCLUDED.withheld_for_unrectified_defects,
    net_released_amount = EXCLUDED.net_released_amount,
    release_sanction_date = EXCLUDED.release_sanction_date,
    status = EXCLUDED.status,
    retention_mode = EXCLUDED.retention_mode,
    bg_guarantee_ref = EXCLUDED.bg_guarantee_ref,
    bg_validity_date = EXCLUDED.bg_validity_date;

-- 7.3 Statutory No-Claims Undertaking Record
INSERT INTO public.statutory_no_claims_undertakings (
    id,
    final_bill_id,
    project_id,
    contractor_legal_name,
    authorized_signatory_name,
    signatory_designation,
    final_agreed_settlement_sum,
    no_further_claims_declaration,
    discharge_condition_precedent_met,
    digital_signature_hash,
    attestation_ip_address,
    attested_at,
    created_at
) VALUES (
    'sncu1000-0000-0000-0000-000000000001',
    'fb100000-0000-0000-0000-000000000001',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'M/s Larsen Infra-Structures & Project Holdings Ltd.',
    'Er. R. K. Mahajan',
    'Director & Authorized Signatory',
    11553250.00,
    'Pursuant to CPWD GCC Clause 8B/9, CPWD Form 65, and FIDIC Red Book Clause 14.12, the Contractor hereby unconditionally certifies and covenants that upon receipt of the net certified final payment sum of INR 1,15,53,250.00, all claims, disputes, variations, prolongation damages, price adjustments, and financial demands arising out of or in connection with Agreement No. 42/EE/SPD-II/2024-25 are fully, finally, and irrevocably settled, extinguished, and discharged in full without reservation.',
    true,
    'SHA256:d8c9a4e76f1b3c0e5a882194fbc267d3e02f9c118742b58e723910c54179f83a',
    '115.244.112.98',
    '2026-08-18T16:30:00+05:30',
    '2026-08-18T16:30:00+05:30'
)
ON CONFLICT (id) DO UPDATE SET
    final_agreed_settlement_sum = EXCLUDED.final_agreed_settlement_sum,
    no_further_claims_declaration = EXCLUDED.no_further_claims_declaration,
    discharge_condition_precedent_met = EXCLUDED.discharge_condition_precedent_met,
    digital_signature_hash = EXCLUDED.digital_signature_hash,
    attestation_ip_address = EXCLUDED.attestation_ip_address,
    attested_at = EXCLUDED.attested_at;
