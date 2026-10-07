-- =============================================================================
-- Migration: 20260917_final_bill_retention_noclaims
-- Module   : Final Bill, Retention Release & No-Claims Certificate
-- Ref      : CPWD GCC Clause 45 / FIDIC Red Book Clause 14.11 & 14.12
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM: final bill workflow status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.final_bill_status AS ENUM (
    'DRAFT_SUBMITTED',
    'AUDITED_BY_QS',
    'DISCHARGE_VOUCHER_SIGNED',
    'SEOR_CERTIFIED_FINAL',
    'SETTLED_DISBURSED',
    'DISPUTED_ARBITRATION_HOLD'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. ENUM: retention ledger status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.retention_ledger_status AS ENUM (
    'HOLDING_FULL',
    'TRANCHE_1_RELEASED_TOC',
    'TRANCHE_2_RELEASED_DLP',
    'FULLY_RELEASED',
    'DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. TABLE: final_bill_settlements
--    Full terminal commercial settlement ledger per CPWD GCC Cl. 45 /
--    FIDIC Red Book Cl. 14.11 & 14.12.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.final_bill_settlements (
  -- Identity
  id                                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                        TEXT        NOT NULL,
  final_bill_number                 TEXT        NOT NULL,
  work_order_ref                    TEXT        NOT NULL,

  -- Parties
  contractor_name                   TEXT        NOT NULL,
  contractor_entity_type            TEXT        NOT NULL DEFAULT 'COMPANY',  -- 'COMPANY' | 'INDIVIDUAL'
  trade_package                     TEXT        NOT NULL,
  toc_reference                     TEXT        NOT NULL,
  toc_date                          DATE,

  -- Contract financials
  original_contract_sum_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,
  sanctioned_variations_total_inr   NUMERIC(18,2) NOT NULL DEFAULT 0,
  final_measured_gross_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Prior billings
  total_previous_ra_gross_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  mobilization_advance_recovered_inr NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Statutory deductions (CPWD GCC Cl. 45)
  liquidated_damages_inr            NUMERIC(18,2) NOT NULL DEFAULT 0,
  tds_194c_rate_pct                 NUMERIC(5,2)  NOT NULL DEFAULT 2.00,  -- 1% individual / 2% company
  tds_194c_inr                      NUMERIC(18,2) NOT NULL DEFAULT 0,
  gst_tds_rate_pct                  NUMERIC(5,2)  NOT NULL DEFAULT 2.00,
  gst_tds_inr                       NUMERIC(18,2) NOT NULL DEFAULT 0,
  labour_cess_rate_pct              NUMERIC(5,2)  NOT NULL DEFAULT 1.00,
  labour_cess_inr                   NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Retention
  stage_2_retention_released_inr    NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Terminal debits
  terminal_unresolved_ncrs_debit_inr NUMERIC(18,2) NOT NULL DEFAULT 0,
  terminal_cl42_penal_debit_inr      NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Derived summary (stored for audit trail immutability)
  gross_difference_payable_inr      NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_final_payable_inr             NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- PBG / Performance Bond
  pbg_returned_to_contractor        BOOLEAN      NOT NULL DEFAULT FALSE,

  -- No-Claims Discharge (FIDIC Cl. 14.12)
  no_claims_declaration_signed      BOOLEAN      NOT NULL DEFAULT FALSE,
  no_claims_signed_date             DATE,
  discharge_voucher_ref             TEXT,

  -- Workflow status
  status                            public.final_bill_status NOT NULL DEFAULT 'DRAFT_SUBMITTED',

  -- Sign-off chain: QS → SEOR → Project Director
  qs_auditor_name                   TEXT,
  qs_audited_at                     TIMESTAMPTZ,
  seor_signoff_name                 TEXT,
  seor_signed_at                    TIMESTAMPTZ,
  project_director_name             TEXT,
  project_director_ack_at           TIMESTAMPTZ,

  -- Finance disbursement
  finance_disbursed_at              TIMESTAMPTZ,
  bank_utr_reference                TEXT,

  -- Metadata
  audit_notes                       TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fbs_unique_bill_number UNIQUE (project_id, final_bill_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS fbs_project_status_idx
  ON public.final_bill_settlements (project_id, status);

CREATE INDEX IF NOT EXISTS fbs_work_order_idx
  ON public.final_bill_settlements (project_id, work_order_ref);

CREATE INDEX IF NOT EXISTS fbs_created_at_idx
  ON public.final_bill_settlements (project_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.fbs_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS fbs_updated_at_trigger ON public.final_bill_settlements;
CREATE TRIGGER fbs_updated_at_trigger
  BEFORE UPDATE ON public.final_bill_settlements
  FOR EACH ROW EXECUTE FUNCTION public.fbs_set_updated_at();

-- RLS
ALTER TABLE public.final_bill_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fbs_select_authenticated" ON public.final_bill_settlements;
CREATE POLICY "fbs_select_authenticated"
  ON public.final_bill_settlements FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fbs_insert_authenticated" ON public.final_bill_settlements;
CREATE POLICY "fbs_insert_authenticated"
  ON public.final_bill_settlements FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fbs_update_authenticated" ON public.final_bill_settlements;
CREATE POLICY "fbs_update_authenticated"
  ON public.final_bill_settlements FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4. TABLE: retention_release_ledger
--    Two-tranche 5% retention model:
--      Tranche 1 (50%) — released on Taking-Over Certificate (TOC/Practical Completion)
--      Tranche 2 (50%) — released on DLP expiry (FIDIC Cl. 14.9 / CPWD Cl. 17)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retention_release_ledger (
  id                            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                    TEXT        NOT NULL,
  work_order_ref                TEXT        NOT NULL,
  contractor_name               TEXT        NOT NULL,
  trade_package                 TEXT,

  -- Gross contract value for retention calculation
  gross_contract_value_inr      NUMERIC(18,2) NOT NULL DEFAULT 0,
  retention_rate_pct            NUMERIC(5,2)  NOT NULL DEFAULT 5.00,
  total_retention_held_inr      NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Tranche 1: 50% on Practical Completion / Taking-Over Certificate
  tranche_1_amount_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,
  tranche_1_released            BOOLEAN       NOT NULL DEFAULT FALSE,
  tranche_1_toc_date            DATE,
  tranche_1_released_at         TIMESTAMPTZ,
  tranche_1_release_ref         TEXT,        -- Certificate or UTR reference

  -- Tranche 2: 50% after Defects Liability Period expires
  tranche_2_amount_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,
  tranche_2_released            BOOLEAN       NOT NULL DEFAULT FALSE,
  tranche_2_dlp_start_date      DATE,
  tranche_2_dlp_duration_months INTEGER      NOT NULL DEFAULT 12,
  tranche_2_dlp_expiry_date     DATE,
  tranche_2_released_at         TIMESTAMPTZ,
  tranche_2_release_ref         TEXT,

  -- Current balance
  retained_balance_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,
  status                        public.retention_ledger_status NOT NULL DEFAULT 'HOLDING_FULL',

  -- Linked to final bill
  final_bill_settlement_id      TEXT REFERENCES public.final_bill_settlements(id) ON DELETE SET NULL,

  -- Metadata
  notes                         TEXT,
  created_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT rrl_unique_wo UNIQUE (project_id, work_order_ref)
);

-- Indexes
CREATE INDEX IF NOT EXISTS rrl_project_idx
  ON public.retention_release_ledger (project_id);

CREATE INDEX IF NOT EXISTS rrl_status_idx
  ON public.retention_release_ledger (project_id, status);

CREATE INDEX IF NOT EXISTS rrl_dlp_expiry_idx
  ON public.retention_release_ledger (tranche_2_dlp_expiry_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.rrl_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS rrl_updated_at_trigger ON public.retention_release_ledger;
CREATE TRIGGER rrl_updated_at_trigger
  BEFORE UPDATE ON public.retention_release_ledger
  FOR EACH ROW EXECUTE FUNCTION public.rrl_set_updated_at();

-- RLS
ALTER TABLE public.retention_release_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrl_select_authenticated" ON public.retention_release_ledger;
CREATE POLICY "rrl_select_authenticated"
  ON public.retention_release_ledger FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rrl_insert_authenticated" ON public.retention_release_ledger;
CREATE POLICY "rrl_insert_authenticated"
  ON public.retention_release_ledger FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rrl_update_authenticated" ON public.retention_release_ledger;
CREATE POLICY "rrl_update_authenticated"
  ON public.retention_release_ledger FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 5. TABLE: no_claims_undertakings
--    Statutory contractor No-Claims Certificate per FIDIC Cl. 14.12 /
--    CPWD GCC Clause 9A. Three-party sign-off: Contractor → QS → SEOR.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.no_claims_undertakings (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  final_bill_settlement_id        TEXT        REFERENCES public.final_bill_settlements(id) ON DELETE CASCADE,
  contractor_name                 TEXT        NOT NULL,
  work_order_ref                  TEXT        NOT NULL,
  trade_package                   TEXT,

  -- Legal declaration
  net_settlement_amount_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  declaration_text                TEXT,        -- Full statutory boilerplate stored at signing

  -- Stage 1: Contractor execution
  signed_by_contractor            TEXT,
  contractor_designation          TEXT,
  signed_date                     DATE,
  contractor_seal_ref             TEXT,

  -- Stage 2: Quantity Surveyor witness
  witnessed_by_qs                 TEXT,
  qs_employee_id                  TEXT,
  witnessed_date                  DATE,
  qs_audit_remarks                TEXT,

  -- Stage 3: SEOR / Engineer certification (FIDIC Cl. 14.12 Final Certificate trigger)
  certified_by_seor               TEXT,
  seor_employee_id                TEXT,
  seor_cert_date                  DATE,
  seor_cert_remarks               TEXT,

  -- Stage 4 (optional): Project Director acknowledgement
  director_acknowledged_by        TEXT,
  director_ack_date               DATE,

  -- Discharge instrument
  discharge_voucher_ref           TEXT,
  is_legally_binding              BOOLEAN     NOT NULL DEFAULT FALSE,
  legally_binding_from            DATE,

  -- Metadata
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ncu_unique_settlement UNIQUE (final_bill_settlement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ncu_project_idx
  ON public.no_claims_undertakings (project_id);

CREATE INDEX IF NOT EXISTS ncu_work_order_idx
  ON public.no_claims_undertakings (project_id, work_order_ref);

CREATE INDEX IF NOT EXISTS ncu_legally_binding_idx
  ON public.no_claims_undertakings (project_id, is_legally_binding);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.ncu_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS ncu_updated_at_trigger ON public.no_claims_undertakings;
CREATE TRIGGER ncu_updated_at_trigger
  BEFORE UPDATE ON public.no_claims_undertakings
  FOR EACH ROW EXECUTE FUNCTION public.ncu_set_updated_at();

-- RLS
ALTER TABLE public.no_claims_undertakings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncu_select_authenticated" ON public.no_claims_undertakings;
CREATE POLICY "ncu_select_authenticated"
  ON public.no_claims_undertakings FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ncu_insert_authenticated" ON public.no_claims_undertakings;
CREATE POLICY "ncu_insert_authenticated"
  ON public.no_claims_undertakings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ncu_update_authenticated" ON public.no_claims_undertakings;
CREATE POLICY "ncu_update_authenticated"
  ON public.no_claims_undertakings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. Backward-compat: keep the old contract_final_bills table working
--    if it already exists (add new columns idempotently)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.contract_final_bills
    ADD COLUMN IF NOT EXISTS tds_194c_inr              NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_tds_inr               NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS labour_cess_inr            NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS liquidated_damages_inr     NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mobilization_advance_recovered_inr NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contractor_entity_type     TEXT DEFAULT 'COMPANY',
    ADD COLUMN IF NOT EXISTS toc_date                   DATE,
    ADD COLUMN IF NOT EXISTS qs_audited_at              TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS project_director_name      TEXT,
    ADD COLUMN IF NOT EXISTS project_director_ack_at    TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 7. Realtime publication for all three tables
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'final_bill_settlements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.final_bill_settlements;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'retention_release_ledger'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retention_release_ledger;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'no_claims_undertakings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.no_claims_undertakings;
  END IF;
END $$;

-- =============================================================================
-- End of migration: 20260917_final_bill_retention_noclaims
-- =============================================================================
