-- =============================================================================
-- Migration: 20260917_project_closeout_summary
-- Module   : Project Closeout Executive Dashboard & Master KPI Command Hub
-- Ref      : CPWD Works Manual Chapter VI (Executive Reporting & Completion Reports)
--            FIDIC Red Book Clause 10 (Taking-Over of the Works)
--            FIDIC Red Book Clause 11 (Defects Liability)
--            FIDIC Red Book Clause 14 (Contract Price and Payment)
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS FOR CLOSEOUT STATUS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.closeout_stage_status AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'COMPLETE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: PROJECT CLOSEOUT SUMMARIES (Consolidated Rollup Table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_closeout_summaries (
  id TEXT PRIMARY KEY DEFAULT ('pcr-sum-' || floor(random() * 1000000)::text),
  project_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  project_location TEXT,
  contractor_name TEXT,
  client_name TEXT,
  pcr_number TEXT,
  pcr_status TEXT DEFAULT 'DIRECTOR_APPROVED',

  -- Commercial & Financial Reconciliation (INR)
  sanctioned_budget_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  final_contract_value_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  actual_expenditure_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  cost_variance_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  cost_variance_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  spi_value NUMERIC(6,4) NOT NULL DEFAULT 1.0000,

  -- Retention & Escrow Fiduciary Metrics (INR)
  total_retention_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  released_retention_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  net_retention_balance_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  escrow_balance_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  pending_claims_inr NUMERIC(15,2) NOT NULL DEFAULT 0.00,

  -- Quality, Punch List & Defect Rectification Metrics
  active_defects_count INT NOT NULL DEFAULT 0,
  cleared_defects_count INT NOT NULL DEFAULT 0,
  total_defects_count INT NOT NULL DEFAULT 0,
  defect_clearance_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,

  -- Statutory Approvals & Regulatory Compliance Metrics
  total_statutory_certs_count INT NOT NULL DEFAULT 0,
  valid_statutory_certs_count INT NOT NULL DEFAULT 0,
  pending_statutory_clearances_count INT NOT NULL DEFAULT 0,
  statutory_compliance_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,

  -- Permanent Asset Handover & Digital Engineering Inventory
  total_facility_assets_count INT NOT NULL DEFAULT 0,
  handed_over_assets_count INT NOT NULL DEFAULT 0,
  as_built_drawings_count INT NOT NULL DEFAULT 0,
  om_manuals_count INT NOT NULL DEFAULT 0,

  -- Composite Lifecycle Progress (0 - 100)
  closeout_overall_progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  overall_closeout_status public.closeout_stage_status NOT NULL DEFAULT 'IN_REVIEW',
  last_audited_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-PERFORMANCE DASHBOARD QUERIES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pcr_sum_proj_id ON public.project_closeout_summaries (project_id);
CREATE INDEX IF NOT EXISTS idx_pcr_sum_status ON public.project_closeout_summaries (overall_closeout_status);
CREATE INDEX IF NOT EXISTS idx_pcr_sum_updated ON public.project_closeout_summaries (updated_at DESC);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_closeout_summaries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow public read project_closeout_summaries"
    ON public.project_closeout_summaries
    FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated insert/update project_closeout_summaries"
    ON public.project_closeout_summaries
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 5. REALTIME REPLICATION PUBLICATION
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_closeout_summaries;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. UNIFIED SQL VIEW: project_closeout_summary
-- ---------------------------------------------------------------------------
-- Idempotent view aggregating live closeout metrics across project tables
CREATE OR REPLACE VIEW public.project_closeout_summary AS
SELECT
  s.id,
  s.project_id,
  s.project_name,
  s.project_location,
  s.contractor_name,
  s.client_name,
  s.pcr_number,
  s.pcr_status,
  s.sanctioned_budget_inr,
  s.final_contract_value_inr,
  s.actual_expenditure_inr,
  s.cost_variance_inr,
  s.cost_variance_pct,
  s.spi_value,
  s.total_retention_inr,
  s.released_retention_inr,
  s.net_retention_balance_inr,
  s.escrow_balance_inr,
  s.pending_claims_inr,
  s.active_defects_count,
  s.cleared_defects_count,
  s.total_defects_count,
  s.defect_clearance_pct,
  s.total_statutory_certs_count,
  s.valid_statutory_certs_count,
  s.pending_statutory_clearances_count,
  s.statutory_compliance_pct,
  s.total_facility_assets_count,
  s.handed_over_assets_count,
  s.as_built_drawings_count,
  s.om_manuals_count,
  s.closeout_overall_progress_pct,
  s.overall_closeout_status,
  s.last_audited_at,
  s.updated_at
FROM public.project_closeout_summaries s;

-- Grant view permissions
GRANT SELECT ON public.project_closeout_summary TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. SEED DATA (Idempotent UPSERT)
-- ---------------------------------------------------------------------------
INSERT INTO public.project_closeout_summaries (
  id,
  project_id,
  project_name,
  project_location,
  contractor_name,
  client_name,
  pcr_number,
  pcr_status,
  sanctioned_budget_inr,
  final_contract_value_inr,
  actual_expenditure_inr,
  cost_variance_inr,
  cost_variance_pct,
  spi_value,
  total_retention_inr,
  released_retention_inr,
  net_retention_balance_inr,
  escrow_balance_inr,
  pending_claims_inr,
  active_defects_count,
  cleared_defects_count,
  total_defects_count,
  defect_clearance_pct,
  total_statutory_certs_count,
  valid_statutory_certs_count,
  pending_statutory_clearances_count,
  statutory_compliance_pct,
  total_facility_assets_count,
  handed_over_assets_count,
  as_built_drawings_count,
  om_manuals_count,
  closeout_overall_progress_pct,
  overall_closeout_status,
  last_audited_at,
  updated_at
)
VALUES
  (
    'pcr-sum-lko-001',
    'PRJ-LKO-TOWER-A',
    'Tower A Gomti Nagar Extension High-Rise Commercial Hub',
    'Gomti Nagar Extension, Sector 7, Lucknow, UP',
    'Apex Infrastructure Ltd & Associated Consortium',
    'Lucknow Development Authority (LDA) / Commercial SPV',
    'PCR/LKO/2026/001',
    'DIRECTOR_APPROVED',
    250000000.00, -- Sanctioned 25.00 Cr
    248500000.00, -- Contract 24.85 Cr
    241800000.00, -- Incurred 24.18 Cr
    -8200000.00,  -- Net Savings ₹82.00 Lakhs
    -3.28,        -- 3.28% financial savings
    0.9840,       -- SPI
    12425000.00,  -- 5% Retention (1.24 Cr)
    6212500.00,   -- Tranche 1 Released (50%)
    6212500.00,   -- Tranche 2 Held Post-DLP
    7240000.00,   -- Escrow Balance (incl interest)
    250000.00,    -- 3rd-Party Defect Claim
    3,            -- Active Defect Count
    28,           -- Cleared Defects
    31,           -- Total Defect Count
    90.32,        -- Defect Clearance %
    18,           -- Total Statutory Certs
    17,           -- Valid / Permanent NOCs
    1,            -- Pending Renewal
    94.44,        -- Statutory Compliance %
    24,           -- Total Facility Assets
    21,           -- Handed Over Assets
    42,           -- As-Built Drawings
    16,           -- O&M Manuals
    92.50,        -- Overall Progress %
    'IN_REVIEW',
    now(),
    now()
  ),
  (
    'pcr-sum-gomti-002',
    'PRJ-1BHK-GOMTI',
    'Gomti Nagar Affordable Residential Precast Complex (Phase 1)',
    'Shaheed Path, Gomti Enclave, Lucknow, UP',
    'Awadh Buildcon & Fitout Contractors LLP',
    'UP Avas Vikas Parishad (UPAVP)',
    'PCR/GOMTI/2026/002',
    'CLIENT_ACCEPTED',
    95000000.00,  -- Sanctioned 9.50 Cr
    93800000.00,  -- Contract 9.38 Cr
    92150000.00,  -- Incurred 9.21 Cr
    -2850000.00,  -- Net Savings ₹28.50 Lakhs
    -3.00,        -- 3.00% financial savings
    1.0020,       -- SPI (Ahead)
    4690000.00,   -- 5% Retention
    4690000.00,   -- 100% Retention Released
    0.00,         -- Zero Retention Held
    0.00,         -- Escrow Reconciled
    0.00,         -- Zero Pending Claims
    0,            -- 0 Active Defects
    19,           -- 19 Cleared Defects
    19,           -- Total Defects
    100.00,       -- 100% Cleared
    14,           -- Total Statutory Certs
    14,           -- 14 Valid Certs
    0,            -- 0 Pending Clearances
    100.00,       -- 100% Compliance
    16,           -- Total Assets
    16,           -- 16 Handed Over
    28,           -- As-Built Drawings
    12,           -- O&M Manuals
    100.00,       -- 100% Overall Progress
    'COMPLETE',
    now(),
    now()
  )
ON CONFLICT (project_id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  project_location = EXCLUDED.project_location,
  contractor_name = EXCLUDED.contractor_name,
  client_name = EXCLUDED.client_name,
  sanctioned_budget_inr = EXCLUDED.sanctioned_budget_inr,
  final_contract_value_inr = EXCLUDED.final_contract_value_inr,
  actual_expenditure_inr = EXCLUDED.actual_expenditure_inr,
  cost_variance_inr = EXCLUDED.cost_variance_inr,
  cost_variance_pct = EXCLUDED.cost_variance_pct,
  spi_value = EXCLUDED.spi_value,
  total_retention_inr = EXCLUDED.total_retention_inr,
  released_retention_inr = EXCLUDED.released_retention_inr,
  net_retention_balance_inr = EXCLUDED.net_retention_balance_inr,
  escrow_balance_inr = EXCLUDED.escrow_balance_inr,
  pending_claims_inr = EXCLUDED.pending_claims_inr,
  active_defects_count = EXCLUDED.active_defects_count,
  cleared_defects_count = EXCLUDED.cleared_defects_count,
  total_defects_count = EXCLUDED.total_defects_count,
  defect_clearance_pct = EXCLUDED.defect_clearance_pct,
  total_statutory_certs_count = EXCLUDED.total_statutory_certs_count,
  valid_statutory_certs_count = EXCLUDED.valid_statutory_certs_count,
  pending_statutory_clearances_count = EXCLUDED.pending_statutory_clearances_count,
  statutory_compliance_pct = EXCLUDED.statutory_compliance_pct,
  total_facility_assets_count = EXCLUDED.total_facility_assets_count,
  handed_over_assets_count = EXCLUDED.handed_over_assets_count,
  as_built_drawings_count = EXCLUDED.as_built_drawings_count,
  om_manuals_count = EXCLUDED.om_manuals_count,
  closeout_overall_progress_pct = EXCLUDED.closeout_overall_progress_pct,
  overall_closeout_status = EXCLUDED.overall_closeout_status,
  updated_at = now();
