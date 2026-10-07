-- =============================================================================
-- Migration: 20260917_client_financial_closeout_ledger
-- Module   : Client Financial Closeout & Retention Release Ledger
-- Ref      : CPWD GCC Financial Accounting Standards
--            FIDIC Red Book Clause 14.11 (Final Statement)
--            FIDIC Red Book Clause 14.12 (Discharge)
--            FIDIC Red Book Clause 14.13 (Issue of Final Payment Certificate)
--            FIDIC Red Book Clause 14.14 (Cessation of Employer's Liability)
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.client_settlement_status AS ENUM (
    'DRAFT',
    'PENDING_DIRECTOR_APPROVAL',
    'PENDING_ACCOUNTS_APPROVAL',
    'FINALLY_SETTLED',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.retention_tranche_status AS ENUM (
    'HELD',
    'RELEASE_REQUESTED',
    'RELEASED',
    'REVERTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.phase_financial_status AS ENUM (
    'ACTIVE',
    'RECONCILED',
    'SETTLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: client_final_ledger
--    Executive financial closeout reconciliation for Client / Employer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_final_ledger (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL UNIQUE,
  client_name                     TEXT        NOT NULL,
  client_org_code                 TEXT        NOT NULL,
  contract_code                   TEXT        NOT NULL,
  project_title                   TEXT        NOT NULL,
  agreement_date                  DATE,

  -- Financial Heads (INR)
  total_contract_sum              NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Original Sanctioned LOA Amount
  authorized_variations           NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Net Approved Variation Orders
  price_adjustment_inr            NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Escalation / Price Indexing
  gross_contract_value            NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Sum of Contract + Variations + Escalation

  liquidated_damages_applied      NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- LD Credited to Client for Delays
  net_adjusted_contract_value     NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Gross less LD

  -- Cash Flow & Realization
  total_certified_payouts         NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Total Cumulative Billings Certified
  total_funds_received            NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Cumulative Client Remittances Received
  net_balance_receivable_payable  NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- (+ Receivable from Client, - Refund to Client)

  -- Executive Sign-Off Workflow
  final_settlement_status         public.client_settlement_status NOT NULL DEFAULT 'DRAFT',

  director_approved               BOOLEAN       NOT NULL DEFAULT FALSE,
  director_name                   TEXT,
  director_approved_at            TIMESTAMPTZ,
  director_remarks                TEXT,

  accounts_approved               BOOLEAN       NOT NULL DEFAULT FALSE,
  accounts_lead_name              TEXT,
  accounts_approved_at            TIMESTAMPTZ,
  accounts_remarks                TEXT,

  -- Certificate & Legal Clearance
  no_dues_certificate_number      TEXT,
  no_dues_issued_date             DATE,
  notes                           TEXT,

  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS cfl_project_idx ON public.client_final_ledger (project_id);
CREATE INDEX IF NOT EXISTS cfl_status_idx ON public.client_final_ledger (project_id, final_settlement_status);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.cfl_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS cfl_updated_at_trigger ON public.client_final_ledger;
CREATE TRIGGER cfl_updated_at_trigger
  BEFORE UPDATE ON public.client_final_ledger
  FOR EACH ROW EXECUTE FUNCTION public.cfl_set_updated_at();

-- RLS
ALTER TABLE public.client_final_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfl_select_all" ON public.client_final_ledger;
CREATE POLICY "cfl_select_all"
  ON public.client_final_ledger FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "cfl_insert_auth" ON public.client_final_ledger;
CREATE POLICY "cfl_insert_auth"
  ON public.client_final_ledger FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "cfl_update_auth" ON public.client_final_ledger;
CREATE POLICY "cfl_update_auth"
  ON public.client_final_ledger FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. TABLE: client_retention_releases
--    Automated dual-tranche retention escrow tracking (50% TOC / 50% DLP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_retention_releases (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  client_ledger_id                TEXT        REFERENCES public.client_final_ledger(id) ON DELETE CASCADE,
  retention_account_number        TEXT        NOT NULL, -- Escrow Account Ref
  escrow_bank_name                TEXT        NOT NULL DEFAULT 'State Bank of India (Commercial Escrow)',

  total_retention_retained_inr    NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- 5% of gross certified billings

  -- Tranche 1: 50% on Practical Completion / Taking-Over Certificate (TOC)
  tranche_1_amount_inr            NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  tranche_1_status                public.retention_tranche_status NOT NULL DEFAULT 'HELD',
  tranche_1_released_date         DATE,
  tranche_1_utr_ref               TEXT,

  -- Tranche 2: 50% post-Defect Liability Period (DLP) Expiry
  tranche_2_amount_inr            NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  tranche_2_status                public.retention_tranche_status NOT NULL DEFAULT 'HELD',
  tranche_2_released_date         DATE,
  tranche_2_utr_ref               TEXT,

  -- Financial Balancing
  interest_accrued_inr            NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  tax_deducted_inr                NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  net_retention_released_inr      NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  retention_balance_remaining_inr NUMERIC(18,2) NOT NULL DEFAULT 0.00,

  dlp_expiry_date                 DATE,
  final_performance_certificate_ref TEXT,
  remarks                         TEXT,

  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS crr_project_idx ON public.client_retention_releases (project_id);
CREATE INDEX IF NOT EXISTS crr_ledger_idx ON public.client_retention_releases (client_ledger_id);
CREATE INDEX IF NOT EXISTS crr_dlp_idx ON public.client_retention_releases (dlp_expiry_date);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.crr_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS crr_updated_at_trigger ON public.client_retention_releases;
CREATE TRIGGER crr_updated_at_trigger
  BEFORE UPDATE ON public.client_retention_releases
  FOR EACH ROW EXECUTE FUNCTION public.crr_set_updated_at();

-- RLS
ALTER TABLE public.client_retention_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crr_select_all" ON public.client_retention_releases;
CREATE POLICY "crr_select_all"
  ON public.client_retention_releases FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "crr_insert_auth" ON public.client_retention_releases;
CREATE POLICY "crr_insert_auth"
  ON public.client_retention_releases FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "crr_update_auth" ON public.client_retention_releases;
CREATE POLICY "crr_update_auth"
  ON public.client_retention_releases FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. TABLE: client_phase_billing_records
--    Phase-by-phase balance sheet reconciliation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_phase_billing_records (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  client_ledger_id                TEXT        REFERENCES public.client_final_ledger(id) ON DELETE CASCADE,
  phase_code                      TEXT        NOT NULL, -- PH-01, PH-02...
  phase_name                      TEXT        NOT NULL,
  sanctioned_amount_inr           NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  billed_amount_inr               NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  received_amount_inr             NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  variance_inr                    NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- (Billed - Sanctioned)
  phase_status                    public.phase_financial_status NOT NULL DEFAULT 'ACTIVE',
  completion_date                 DATE,
  notes                           TEXT,

  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS cpbr_project_idx ON public.client_phase_billing_records (project_id);
CREATE INDEX IF NOT EXISTS cpbr_ledger_idx ON public.client_phase_billing_records (client_ledger_id);

-- RLS
ALTER TABLE public.client_phase_billing_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpbr_select_all" ON public.client_phase_billing_records;
CREATE POLICY "cpbr_select_all"
  ON public.client_phase_billing_records FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "cpbr_insert_auth" ON public.client_phase_billing_records;
CREATE POLICY "cpbr_insert_auth"
  ON public.client_phase_billing_records FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. Realtime Publication Registration
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'client_final_ledger'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_final_ledger;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'client_retention_releases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_retention_releases;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'client_phase_billing_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_phase_billing_records;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. SEED DATA (Idempotent UPSERTs)
-- ---------------------------------------------------------------------------

-- 6.1 Commercial Project (Tower A Core & Shell)
INSERT INTO public.client_final_ledger (
  id, project_id, client_name, client_org_code, contract_code, project_title, agreement_date,
  total_contract_sum, authorized_variations, price_adjustment_inr, gross_contract_value,
  liquidated_damages_applied, net_adjusted_contract_value, total_certified_payouts,
  total_funds_received, net_balance_receivable_payable, final_settlement_status,
  director_approved, director_name, director_approved_at, director_remarks,
  accounts_approved, accounts_lead_name, accounts_approved_at, accounts_remarks,
  no_dues_certificate_number, no_dues_issued_date, notes
) VALUES (
  'cfl-001', 'PRJ-LKO-TOWER-A', 'Lucknow Metro Rail Corporation / UPMRC', 'UPMRC-GOV-01',
  'QL-CON-2024-TWR-A', 'Tower A Core & Shell Commercial Complex', '2024-02-15',
  280000000.00, 14200000.00, 4800000.00, 299000000.00,
  1800000.00, 297200000.00, 297200000.00,
  292500000.00, 4700000.00, 'PENDING_ACCOUNTS_APPROVAL',
  TRUE, 'Er. Rajeshwar Nath Tripathi (Project Director)', '2026-03-12 11:00:00+05:30',
  'Technical and quality handover confirmed. Liquidated damages of ₹18 L for 27-day net delay factored into final balance.',
  FALSE, 'Alok Saxena (Accounts Lead)', NULL,
  'Pending final GST reconciliation and BOCW cess audit before release of final ₹47.00 L balance tranche.',
  'NODUES/UPMRC/2026/01', '2026-03-14',
  'Final Statement generated per FIDIC Clause 14.11. Tranche 1 retention of 50% released at TOC.'
)
ON CONFLICT (project_id)
DO UPDATE SET
  total_contract_sum = EXCLUDED.total_contract_sum,
  authorized_variations = EXCLUDED.authorized_variations,
  price_adjustment_inr = EXCLUDED.price_adjustment_inr,
  gross_contract_value = EXCLUDED.gross_contract_value,
  liquidated_damages_applied = EXCLUDED.liquidated_damages_applied,
  net_adjusted_contract_value = EXCLUDED.net_adjusted_contract_value,
  total_certified_payouts = EXCLUDED.total_certified_payouts,
  total_funds_received = EXCLUDED.total_funds_received,
  net_balance_receivable_payable = EXCLUDED.net_balance_receivable_payable,
  final_settlement_status = EXCLUDED.final_settlement_status,
  updated_at = NOW();

-- 6.2 Residential Project (1BHK Gomti Nagar Fit-Out)
INSERT INTO public.client_final_ledger (
  id, project_id, client_name, client_org_code, contract_code, project_title, agreement_date,
  total_contract_sum, authorized_variations, price_adjustment_inr, gross_contract_value,
  liquidated_damages_applied, net_adjusted_contract_value, total_certified_payouts,
  total_funds_received, net_balance_receivable_payable, final_settlement_status,
  director_approved, director_name, director_approved_at, director_remarks,
  accounts_approved, accounts_lead_name, accounts_approved_at, accounts_remarks,
  no_dues_certificate_number, no_dues_issued_date, notes
) VALUES (
  'cfl-002', 'PRJ-1BHK-GOMTI', 'Dr. Rajiv & Dr. Sunita Kacker', 'PRIV-LKO-2025-01',
  'QL-CON-2025-RES-01', '1BHK Luxury Apartment Turnkey Interior Fit-Out', '2025-01-10',
  6800000.00, 240000.00, 0.00, 7040000.00,
  0.00, 7040000.00, 7040000.00,
  7040000.00, 0.00, 'FINALLY_SETTLED',
  TRUE, 'Ar. Rajan Mehta (Principal Architect & Director)', '2026-03-02 14:30:00+05:30',
  'Superlative execution. Zero snags noted. Completed ahead of scheduled completion date.',
  TRUE, 'Meenakshi Verma (Accounts Manager)', '2026-03-03 10:00:00+05:30',
  '100% payments realized including final invoice and both retention tranches.',
  'NODUES/RES/2026/04', '2026-03-03',
  'Turnkey residential closeout complete. All warranties and statutory certificates handed over.'
)
ON CONFLICT (project_id)
DO UPDATE SET
  total_contract_sum = EXCLUDED.total_contract_sum,
  authorized_variations = EXCLUDED.authorized_variations,
  gross_contract_value = EXCLUDED.gross_contract_value,
  net_adjusted_contract_value = EXCLUDED.net_adjusted_contract_value,
  total_certified_payouts = EXCLUDED.total_certified_payouts,
  total_funds_received = EXCLUDED.total_funds_received,
  net_balance_receivable_payable = EXCLUDED.net_balance_receivable_payable,
  final_settlement_status = EXCLUDED.final_settlement_status,
  updated_at = NOW();

-- 6.3 Retention Releases
INSERT INTO public.client_retention_releases (
  id, project_id, client_ledger_id, retention_account_number, escrow_bank_name,
  total_retention_retained_inr, tranche_1_amount_inr, tranche_1_status,
  tranche_1_released_date, tranche_1_utr_ref, tranche_2_amount_inr, tranche_2_status,
  tranche_2_released_date, tranche_2_utr_ref, interest_accrued_inr, tax_deducted_inr,
  net_retention_released_inr, retention_balance_remaining_inr, dlp_expiry_date,
  final_performance_certificate_ref, remarks
) VALUES
(
  'crr-001', 'PRJ-LKO-TOWER-A', 'cfl-001', 'ESC-SBIN-LKO-882104', 'State Bank of India (Commercial Escrow Branch)',
  14860000.00, 7430000.00, 'RELEASED',
  '2026-02-28', 'SBIN426058912301', 7430000.00, 'HELD',
  NULL, NULL, 312000.00, 31200.00,
  7430000.00, 7430000.00, '2027-02-28',
  'FPC/TWR/2026/01',
  'Tranche 1 released upon Taking-Over Certificate (TOC). Tranche 2 (₹74.30 L) matures post-12-month DLP on 28 Feb 2027.'
),
(
  'crr-002', 'PRJ-1BHK-GOMTI', 'cfl-002', 'ESC-HDFC-GMN-339120', 'HDFC Bank (Gomti Nagar Main Branch)',
  352000.00, 176000.00, 'RELEASED',
  '2026-01-15', 'HDFC9901452109', 176000.00, 'RELEASED',
  '2026-03-01', 'HDFC9902881240', 8400.00, 840.00,
  352000.00, 0.00, '2026-02-28',
  'FPC/RES/2026/02',
  'Both retention tranches fully released upon defect-free completion and early warranty clearance.'
)
ON CONFLICT (id) DO NOTHING;

-- 6.4 Phase Billing Records (Tower A Commercial Complex)
INSERT INTO public.client_phase_billing_records (
  id, project_id, client_ledger_id, phase_code, phase_name,
  sanctioned_amount_inr, billed_amount_inr, received_amount_inr, variance_inr,
  phase_status, completion_date, notes
) VALUES
(
  'cpb-001', 'PRJ-LKO-TOWER-A', 'cfl-001', 'PH-01', 'Substructure, Piling & Foundation Works',
  56000000.00, 58400000.00, 58400000.00, 2400000.00,
  'SETTLED', '2024-09-30', '100% certified e-MB measurements realized.'
),
(
  'cpb-002', 'PRJ-LKO-TOWER-A', 'cfl-001', 'PH-02', 'Superstructure RCC Frame & Post-Tensioned Slabs',
  98000000.00, 102500000.00, 102500000.00, 4500000.00,
  'SETTLED', '2025-05-31', 'Floor-wise structural casting certified.'
),
(
  'cpb-003', 'PRJ-LKO-TOWER-A', 'cfl-001', 'PH-03', 'MEP HVAC, Substation, DG Sets & Fire Fighting',
  52000000.00, 55750000.00, 54000000.00, 3750000.00,
  'RECONCILED', '2025-11-30', '₹17.50 L under final invoice verification.'
),
(
  'cpb-004', 'PRJ-LKO-TOWER-A', 'cfl-001', 'PH-04', 'Facade Unitized Glazing, Roofing & Civil Finishes',
  54000000.00, 57450000.00, 56000000.00, 3450000.00,
  'RECONCILED', '2026-01-31', '₹14.50 L held pending testing certificates.'
),
(
  'cpb-005', 'PRJ-LKO-TOWER-A', 'cfl-001', 'PH-05', 'Testing, Integrated Commissioning & Handover (TOC)',
  20000000.00, 23100000.00, 21600000.00, 3100000.00,
  'ACTIVE', '2026-03-10', 'Final milestone claim filed; ₹15.00 L clearance in progress.'
)
ON CONFLICT (id) DO NOTHING;

-- Phase Billing Records (1BHK Gomti Nagar Fit-Out)
INSERT INTO public.client_phase_billing_records (
  id, project_id, client_ledger_id, phase_code, phase_name,
  sanctioned_amount_inr, billed_amount_inr, received_amount_inr, variance_inr,
  phase_status, completion_date, notes
) VALUES
(
  'cpb-101', 'PRJ-1BHK-GOMTI', 'cfl-002', 'PH-01', 'Demolition, Masonry & Wet Area Waterproofing',
  1200000.00, 1180000.00, 1180000.00, -20000.00,
  'SETTLED', '2025-02-15', 'Completed with ₹20,000 cost savings.'
),
(
  'cpb-102', 'PRJ-1BHK-GOMTI', 'cfl-002', 'PH-02', 'Concealed Electrical & Plumbing Rough-Ins',
  1500000.00, 1540000.00, 1540000.00, 40000.00,
  'SETTLED', '2025-04-10', 'Pressure test passed without leaks.'
),
(
  'cpb-103', 'PRJ-1BHK-GOMTI', 'cfl-002', 'PH-03', 'Custom Millwork, Kitchen Cabinetry & Joinery',
  2400000.00, 2520000.00, 2520000.00, 120000.00,
  'SETTLED', '2025-09-30', 'Italian hardware upgrade client-approved.'
),
(
  'cpb-104', 'PRJ-1BHK-GOMTI', 'cfl-002', 'PH-04', 'Flooring, False Ceiling, Painting & Deep Cleaning',
  1700000.00, 1800000.00, 1800000.00, 100000.00,
  'SETTLED', '2026-01-20', 'Zero defect handover achieved.'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- End of migration: 20260917_client_financial_closeout_ledger
-- =============================================================================
