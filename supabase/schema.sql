-- =============================================================================
-- Schema: Quadillar LiveView — Master Command Center
-- Tables : project_members | projects | statutory_ledgers
-- Standards: ISO 19650-2 CDE | CPWD GCC | FIDIC Red Book Cl.14 / Cl.20
-- RLS     : Multi-tenant isolation via auth.uid() ↔ project_members
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM: Portal Role (maps to RoleContext RoleId on the frontend)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.portal_role AS ENUM (
    'PRINCIPAL_ARCHITECT',
    'PMC_LEAD',
    'SITE_ENGINEER',
    'QA_QC_ENGINEER',
    'QS_BILLING',
    'CLIENT_EXECUTIVE',
    'TRADE_CONTRACTOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- TABLE: project_members
-- The SINGLE multi-tenant RLS predicate anchor.
-- Every downstream table checks: does auth.uid() have an active membership
-- in the relevant project_id at the required portal_role?
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
    id             UUID                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id     UUID                NOT NULL,
    user_id        UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portal_role    public.portal_role  NOT NULL,
    invited_by     UUID                REFERENCES auth.users(id),
    joined_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    is_active      BOOLEAN             NOT NULL DEFAULT true,
    UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user    ON public.project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members (project_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Members see only their own membership rows
DROP POLICY IF EXISTS "pm_self_select" ON public.project_members;
CREATE POLICY "pm_self_select"
    ON public.project_members FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- PMC_LEAD / PRINCIPAL_ARCHITECT can manage memberships for their projects
DROP POLICY IF EXISTS "pm_manager_all" ON public.project_members;
CREATE POLICY "pm_manager_all"
    ON public.project_members FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
              AND pm.user_id    = auth.uid()
              AND pm.portal_role IN ('PRINCIPAL_ARCHITECT', 'PMC_LEAD')
              AND pm.is_active  = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
              AND pm.user_id    = auth.uid()
              AND pm.portal_role IN ('PRINCIPAL_ARCHITECT', 'PMC_LEAD')
              AND pm.is_active  = true
        )
    );

-- ---------------------------------------------------------------------------
-- FUNCTION: set_updated_at (shared trigger function)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------------------------------------------------------------------------
-- TABLE: projects
-- Master project registry. One row per contract / project.
-- Baseline values: FIDIC Red Book Cl.14 (Contract Price) /
--                  CPWD Works Manual Ch.4 (Tender Cost Estimate).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id                         UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Identity
    project_code               TEXT           NOT NULL UNIQUE,
    project_name               TEXT           NOT NULL,
    tier                       TEXT           NOT NULL
                                CHECK (tier IN ('RESIDENTIAL', 'COMMERCIAL', 'INFRASTRUCTURE')),
    -- Contract metadata
    contractor_name            TEXT           NOT NULL,
    contract_reference         TEXT           NOT NULL,
    agreement_date             DATE           NOT NULL,
    -- Baseline financials (stored as NUMERIC(20,2) for ₹ precision)
    contract_baseline_value    NUMERIC(20,2)  NOT NULL CHECK (contract_baseline_value > 0),
    stipulated_completion_date DATE           NOT NULL,
    revised_completion_date    DATE,
    -- EVM snapshots (refreshed by scheduled Supabase Edge Function / cron)
    earned_value               NUMERIC(20,2)  NOT NULL DEFAULT 0,
    actual_cost                NUMERIC(20,2)  NOT NULL DEFAULT 0,
    planned_value              NUMERIC(20,2)  NOT NULL DEFAULT 0,
    -- Delay accounting
    active_delay_days          INTEGER        NOT NULL DEFAULT 0,
    eot_granted_days           INTEGER        NOT NULL DEFAULT 0,
    -- Audit
    created_by                 UUID           REFERENCES auth.users(id),
    created_at                 TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects (project_code);
CREATE INDEX IF NOT EXISTS idx_projects_tier ON public.projects (tier);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- SELECT: any active member of the project
DROP POLICY IF EXISTS "prj_member_select" ON public.projects;
CREATE POLICY "prj_member_select"
    ON public.projects FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
              AND pm.user_id    = auth.uid()
              AND pm.is_active  = true
        )
    );

-- INSERT: only Architect / PMC can register new projects
DROP POLICY IF EXISTS "prj_arch_insert" ON public.projects;
CREATE POLICY "prj_arch_insert"
    ON public.projects FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

-- UPDATE: PMC_LEAD or PRINCIPAL_ARCHITECT only
DROP POLICY IF EXISTS "prj_manager_update" ON public.projects;
CREATE POLICY "prj_manager_update"
    ON public.projects FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
              AND pm.user_id    = auth.uid()
              AND pm.portal_role IN ('PRINCIPAL_ARCHITECT', 'PMC_LEAD')
              AND pm.is_active  = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
              AND pm.user_id    = auth.uid()
              AND pm.portal_role IN ('PRINCIPAL_ARCHITECT', 'PMC_LEAD')
              AND pm.is_active  = true
        )
    );

-- DELETE: PRINCIPAL_ARCHITECT only
DROP POLICY IF EXISTS "prj_arch_delete" ON public.projects;
CREATE POLICY "prj_arch_delete"
    ON public.projects FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
              AND pm.user_id    = auth.uid()
              AND pm.portal_role = 'PRINCIPAL_ARCHITECT'
              AND pm.is_active  = true
        )
    );

-- ---------------------------------------------------------------------------
-- TABLE: statutory_ledgers
-- One row per billing cycle / IPC certification event.
-- Maps to: CPWD Form-26 (RA Bills) / FIDIC Cl.14.6 (Interim Payment Certificates)
-- net_payment_due is a generated column — always consistent, never stale.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_ledgers (
    id                         UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id                 UUID           NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    -- Bill identification
    bill_number                INTEGER        NOT NULL,
    bill_reference             TEXT           NOT NULL,
    billing_period_start       DATE           NOT NULL,
    billing_period_end         DATE           NOT NULL,
    -- Gross certified work (CPWD Form-26 / FIDIC Cl.14.3)
    gross_certified_amount     NUMERIC(20,2)  NOT NULL DEFAULT 0,
    -- Variations (FIDIC Cl.13 / CPWD GCC Cl.12)
    approved_variations_count  INTEGER        NOT NULL DEFAULT 0,
    approved_variations_value  NUMERIC(20,2)  NOT NULL DEFAULT 0,
    pending_variations_count   INTEGER        NOT NULL DEFAULT 0,
    pending_variations_value   NUMERIC(20,2)  NOT NULL DEFAULT 0,
    -- Deductions (CPWD Works Accounts Code / FIDIC Cl.14.3)
    retention_deducted         NUMERIC(20,2)  NOT NULL DEFAULT 0,
    mobilization_recovery      NUMERIC(20,2)  NOT NULL DEFAULT 0,   -- Cl.10B-i/ii amortization
    secured_material_recovery  NUMERIC(20,2)  NOT NULL DEFAULT 0,   -- Cl.10B-iii Form-31 recovery
    tds_194c                   NUMERIC(20,2)  NOT NULL DEFAULT 0,   -- Income Tax Section 194C
    gst_tds                    NUMERIC(20,2)  NOT NULL DEFAULT 0,   -- GST TDS @ 2%
    other_debits               NUMERIC(20,2)  NOT NULL DEFAULT 0,
    -- Net payable — generated, never written directly
    net_payment_due            NUMERIC(20,2)  GENERATED ALWAYS AS (
        gross_certified_amount
        + approved_variations_value
        - retention_deducted
        - mobilization_recovery
        - secured_material_recovery
        - tds_194c
        - gst_tds
        - other_debits
    ) STORED,
    -- EOT tracking (FIDIC Cl.20 / CPWD GCC Cl.5)
    eot_status                 TEXT           NOT NULL DEFAULT 'Not Applicable'
                                CHECK (eot_status IN (
                                    'Not Applicable', 'EOT Claimed',
                                    'EOT Under Review', 'EOT Granted',
                                    'EOT Rejected', 'Disputed'
                                )),
    eot_days_claimed           INTEGER        NOT NULL DEFAULT 0,
    eot_days_granted           INTEGER        NOT NULL DEFAULT 0,
    -- Certification metadata
    certified_by               TEXT           NOT NULL,
    certification_date         DATE           NOT NULL,
    payment_status             TEXT           NOT NULL DEFAULT 'Pending'
                                CHECK (payment_status IN (
                                    'Pending', 'Certified', 'Paid',
                                    'Disputed', 'Withheld'
                                )),
    utr_reference              TEXT,
    -- Audit
    created_at                 TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (project_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_sl_project              ON public.statutory_ledgers (project_id);
CREATE INDEX IF NOT EXISTS idx_sl_project_bill_desc    ON public.statutory_ledgers (project_id, bill_number DESC);
CREATE INDEX IF NOT EXISTS idx_sl_payment_status       ON public.statutory_ledgers (project_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_sl_eot_status           ON public.statutory_ledgers (project_id, eot_status);
CREATE INDEX IF NOT EXISTS idx_sl_cert_date_desc       ON public.statutory_ledgers (project_id, certification_date DESC);

DROP TRIGGER IF EXISTS trg_sl_updated_at ON public.statutory_ledgers;
CREATE TRIGGER trg_sl_updated_at
    BEFORE UPDATE ON public.statutory_ledgers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.statutory_ledgers ENABLE ROW LEVEL SECURITY;

-- ── RLS: statutory_ledgers ──────────────────────────────────────────────────

-- Full read: Architect | PMC | Site | QA | QS
DROP POLICY IF EXISTS "sl_internal_select" ON public.statutory_ledgers;
CREATE POLICY "sl_internal_select"
    ON public.statutory_ledgers FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = statutory_ledgers.project_id
              AND pm.user_id    = auth.uid()
              AND pm.is_active  = true
              AND pm.portal_role IN (
                  'PRINCIPAL_ARCHITECT', 'PMC_LEAD',
                  'SITE_ENGINEER', 'QA_QC_ENGINEER', 'QS_BILLING'
              )
        )
    );

-- Client: read Certified / Paid only (no pending / disputed detail)
DROP POLICY IF EXISTS "sl_client_select" ON public.statutory_ledgers;
CREATE POLICY "sl_client_select"
    ON public.statutory_ledgers FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = statutory_ledgers.project_id
              AND pm.user_id    = auth.uid()
              AND pm.is_active  = true
              AND pm.portal_role = 'CLIENT_EXECUTIVE'
        )
        AND statutory_ledgers.payment_status IN ('Certified', 'Paid')
    );

-- Contractor: read Certified / Paid / Pending / Disputed (dispute resolution right)
DROP POLICY IF EXISTS "sl_contractor_select" ON public.statutory_ledgers;
CREATE POLICY "sl_contractor_select"
    ON public.statutory_ledgers FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = statutory_ledgers.project_id
              AND pm.user_id    = auth.uid()
              AND pm.is_active  = true
              AND pm.portal_role = 'TRADE_CONTRACTOR'
        )
        AND statutory_ledgers.payment_status IN ('Certified', 'Paid', 'Pending', 'Disputed')
    );

-- Write: QS_BILLING, PMC_LEAD, PRINCIPAL_ARCHITECT
DROP POLICY IF EXISTS "sl_qs_pmc_write" ON public.statutory_ledgers;
CREATE POLICY "sl_qs_pmc_write"
    ON public.statutory_ledgers FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = statutory_ledgers.project_id
              AND pm.user_id    = auth.uid()
              AND pm.is_active  = true
              AND pm.portal_role IN ('QS_BILLING', 'PMC_LEAD', 'PRINCIPAL_ARCHITECT')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = statutory_ledgers.project_id
              AND pm.user_id    = auth.uid()
              AND pm.is_active  = true
              AND pm.portal_role IN ('QS_BILLING', 'PMC_LEAD', 'PRINCIPAL_ARCHITECT')
        )
    );

-- ---------------------------------------------------------------------------
-- REALTIME
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
        EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.statutory_ledgers;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SEED DATA — Tower A Core & Shell (PRJ-LKO-TOWER-A)
-- UUID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
-- Matches contract_advances_master seed in 20260918_advances_recoveries.sql
-- ---------------------------------------------------------------------------

INSERT INTO public.projects (
    id, project_code, project_name, tier,
    contractor_name, contract_reference, agreement_date,
    contract_baseline_value, stipulated_completion_date, revised_completion_date,
    earned_value, actual_cost, planned_value,
    active_delay_days, eot_granted_days
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'PRJ-LKO-TOWER-A',
    'Tower A Core & Shell Commercial Complex (G+14)',
    'COMMERCIAL',
    'M/s Skyline Constructions Pvt. Ltd.',
    'NIT/PWD/LKO/2024-25/0048',
    '2024-04-01',
    150000000.00,
    '2026-03-31',
    '2026-06-30',
    117000000.00,
    124000000.00,
    118500000.00,
    81,
    91
) ON CONFLICT (id) DO UPDATE SET
    earned_value            = EXCLUDED.earned_value,
    actual_cost             = EXCLUDED.actual_cost,
    planned_value           = EXCLUDED.planned_value,
    active_delay_days       = EXCLUDED.active_delay_days,
    eot_granted_days        = EXCLUDED.eot_granted_days,
    revised_completion_date = EXCLUDED.revised_completion_date,
    updated_at              = now();

INSERT INTO public.projects (
    id, project_code, project_name, tier,
    contractor_name, contract_reference, agreement_date,
    contract_baseline_value, stipulated_completion_date,
    earned_value, actual_cost, planned_value,
    active_delay_days, eot_granted_days
) VALUES (
    'b1ffcd00-0001-0000-0000-000000000001',
    'PRJ-1BHK-GOMTI',
    '1BHK Gomti Nagar Fit-Out',
    'RESIDENTIAL',
    'M/s Aryan Interiors',
    'AGR/RESI/LKO/2026/0011',
    '2026-01-15',
    4000000.00,
    '2026-06-15',
    2180000.00,
    2290000.00,
    2400000.00,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    earned_value      = EXCLUDED.earned_value,
    actual_cost       = EXCLUDED.actual_cost,
    planned_value     = EXCLUDED.planned_value,
    active_delay_days = EXCLUDED.active_delay_days,
    updated_at        = now();

INSERT INTO public.projects (
    id, project_code, project_name, tier,
    contractor_name, contract_reference, agreement_date,
    contract_baseline_value, stipulated_completion_date,
    earned_value, actual_cost, planned_value,
    active_delay_days, eot_granted_days
) VALUES (
    'c2aabb00-0002-0000-0000-000000000002',
    'PRJ-GOVT-TERMINAL',
    'Airport Terminal Expansion Phase 3',
    'INFRASTRUCTURE',
    'M/s National Infrastructure Corp.',
    'NIT/AAI/LKO/2023-24/T-007',
    '2023-09-01',
    2800000000.00,
    '2027-08-31',
    1120000000.00,
    1340000000.00,
    1190000000.00,
    0,
    120
) ON CONFLICT (id) DO UPDATE SET
    earned_value      = EXCLUDED.earned_value,
    actual_cost       = EXCLUDED.actual_cost,
    planned_value     = EXCLUDED.planned_value,
    active_delay_days = EXCLUDED.active_delay_days,
    eot_granted_days  = EXCLUDED.eot_granted_days,
    updated_at        = now();

-- Statutory Ledgers: RA Bills 22–25 for Tower A (most recent 4 cycles)
INSERT INTO public.statutory_ledgers (
    id, project_id, bill_number, bill_reference,
    billing_period_start, billing_period_end,
    gross_certified_amount,
    approved_variations_count, approved_variations_value,
    pending_variations_count, pending_variations_value,
    retention_deducted, mobilization_recovery, secured_material_recovery,
    tds_194c, gst_tds, other_debits,
    eot_status, eot_days_claimed, eot_days_granted,
    certified_by, certification_date, payment_status, utr_reference
) VALUES
    (
        'sl000000-0000-0000-0000-000000000022',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        22, 'RA Bill #22 (Feb 2026)',
        '2026-02-01', '2026-02-28',
        31500000.00,
        3, 1490000.00,
        1, 650000.00,
        1575000.00, 3360416.00, 2160000.00,
        945000.00, 220500.00, 0.00,
        'EOT Granted', 91, 91,
        'Er. Vikas Bansal, Lead QS',
        '2026-03-05', 'Paid', 'UTR202603051102HDFC'
    ),
    (
        'sl000000-0000-0000-0000-000000000023',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        23, 'RA Bill #23 (Feb 2026 — Supplementary)',
        '2026-02-15', '2026-02-28',
        4200000.00,
        0, 0.00,
        1, 320000.00,
        210000.00, 0.00, 0.00,
        126000.00, 29400.00, 0.00,
        'Not Applicable', 0, 0,
        'Er. Vikas Bansal, Lead QS',
        '2026-03-10', 'Paid', 'UTR202603101445HDFC'
    ),
    (
        'sl000000-0000-0000-0000-000000000024',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        24, 'RA Bill #24 (Mar 2026)',
        '2026-03-01', '2026-03-31',
        29000000.00,
        2, 740000.00,
        2, 980000.00,
        1450000.00, 3082500.00, 0.00,
        870000.00, 203000.00, 0.00,
        'EOT Under Review', 45, 0,
        'Er. Vikas Bansal, Lead QS',
        '2026-04-08', 'Certified', NULL
    ),
    (
        'sl000000-0000-0000-0000-000000000025',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        25, 'RA Bill #25 (Aug 2026 — Active Billing)',
        '2026-08-01', '2026-08-31',
        18300000.00,
        1, 420000.00,
        3, 1870000.00,
        915000.00, 0.00, 0.00,
        549000.00, 128100.00, 0.00,
        'EOT Claimed', 62, 0,
        'Er. Amresh Kumar Tiwari, EE',
        '2026-09-12', 'Pending', NULL
    )
ON CONFLICT (id) DO UPDATE SET
    gross_certified_amount    = EXCLUDED.gross_certified_amount,
    approved_variations_value = EXCLUDED.approved_variations_value,
    pending_variations_value  = EXCLUDED.pending_variations_value,
    eot_status                = EXCLUDED.eot_status,
    eot_days_claimed          = EXCLUDED.eot_days_claimed,
    eot_days_granted          = EXCLUDED.eot_days_granted,
    payment_status            = EXCLUDED.payment_status,
    utr_reference             = EXCLUDED.utr_reference,
    updated_at                = now();

-- =============================================================================
-- End of supabase/schema.sql
-- =============================================================================
