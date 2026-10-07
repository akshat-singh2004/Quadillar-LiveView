-- =============================================================================
-- Migration: 20260917_statutory_clearance
-- Module   : Statutory Labour Compliance, BOCW Cess & Final Clearance Tracker
-- Ref      : Building & Other Construction Workers Act 1996 (BOCW)
--            BOCW Welfare Cess Act 1996 (1% on gross construction cost)
--            EPF & MP Act 1952 (12% employer + 12% employee)
--            ESI Act 1948 (3.25% employer + 0.75% employee)
--            CPWD GCC — Statutory compliance conditions
--            Contract Labour (R&A) Act 1970
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM: clearance certificate status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.clearance_cert_status AS ENUM (
    'NOT_SUBMITTED',
    'SUBMITTED_PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'NOT_APPLICABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. ENUM: vendor/subcontractor statutory compliance colour-RAG
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.rag_status AS ENUM (
    'GREEN',   -- fully compliant, all filings current
    'AMBER',   -- minor gap / expiring within 30 days
    'RED',     -- non-compliant / overdue / certificate missing
    'GREY'     -- not yet assessed
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. ENUM: BOCW Cess transaction type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.bocw_transaction_type AS ENUM (
    'RA_BILL_DEDUCTION',
    'FINAL_BILL_DEDUCTION',
    'SUPPLEMENTARY_DEDUCTION',
    'REMITTANCE_TO_WELFARE_BOARD',
    'REFUND_ADJUSTMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. TABLE: statutory_clearances
--    One row per vendor/subcontractor per project.
--    Tracks labour licence, EPF/ESI registration, GST, BOCW cess paid.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_clearances (
  -- Identity
  id                                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                        TEXT        NOT NULL,
  work_order_ref                    TEXT        NOT NULL,
  contractor_name                   TEXT        NOT NULL,
  trade_package                     TEXT,
  contractor_gstin                  TEXT,
  contractor_pan                    TEXT,

  -- ── Labour Licence (Contract Labour R&A Act 1970) ──────────────────────
  labour_licence_number             TEXT,
  labour_licence_issued_date        DATE,
  labour_licence_expiry_date        DATE,
  labour_licence_max_workers        INTEGER,
  labour_licence_status             public.clearance_cert_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  labour_licence_doc_url            TEXT,

  -- ── EPF Registration (EPF & MP Act 1952) ───────────────────────────────
  epf_registration_number           TEXT,                     -- e.g. MH/PUN/12345
  epf_employer_rate_pct             NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  epf_employee_rate_pct             NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  epf_clearance_status              public.clearance_cert_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  epf_last_return_month             TEXT,                     -- YYYY-MM
  epf_arrears_inr                   NUMERIC(18,2) NOT NULL DEFAULT 0,
  epf_no_dues_cert_date             DATE,
  epf_no_dues_cert_url              TEXT,

  -- ── ESI Registration (ESI Act 1948) ────────────────────────────────────
  esi_registration_number           TEXT,                     -- 17-digit sub-code
  esi_employer_rate_pct             NUMERIC(5,2) NOT NULL DEFAULT 3.25,
  esi_employee_rate_pct             NUMERIC(5,2) NOT NULL DEFAULT 0.75,
  esi_clearance_status              public.clearance_cert_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  esi_last_return_month             TEXT,
  esi_arrears_inr                   NUMERIC(18,2) NOT NULL DEFAULT 0,
  esi_no_dues_cert_date             DATE,
  esi_no_dues_cert_url              TEXT,

  -- ── BOCW Cess (BOCW Welfare Cess Act 1996 — 1% of gross cost) ──────────
  bocw_cess_rate_pct                NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  bocw_gross_cost_base_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,  -- gross bills paid
  bocw_total_cess_due_inr           NUMERIC(18,2) NOT NULL DEFAULT 0,  -- computed 1%
  bocw_total_cess_paid_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,  -- remitted
  bocw_balance_due_inr              NUMERIC(18,2) NOT NULL DEFAULT 0,  -- outstanding
  bocw_remittance_status            public.clearance_cert_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  bocw_challan_ref                  TEXT,
  bocw_challan_date                 DATE,
  bocw_challan_url                  TEXT,

  -- ── GST Filing Compliance ───────────────────────────────────────────────
  gst_filing_status                 public.clearance_cert_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  gst_last_filed_period             TEXT,                     -- YYYY-MM
  gst_arrears_inr                   NUMERIC(18,2) NOT NULL DEFAULT 0,
  gst_no_dues_cert_date             DATE,
  gst_no_dues_cert_url              TEXT,

  -- ── Final No-Dues Clearance Certificate ────────────────────────────────
  final_clearance_status            public.clearance_cert_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  final_clearance_issued_date       DATE,
  final_clearance_issued_by         TEXT,
  final_clearance_doc_url           TEXT,
  final_clearance_remarks           TEXT,

  -- ── RAG Composite Status ────────────────────────────────────────────────
  rag_epf                           public.rag_status NOT NULL DEFAULT 'GREY',
  rag_esi                           public.rag_status NOT NULL DEFAULT 'GREY',
  rag_gst                           public.rag_status NOT NULL DEFAULT 'GREY',
  rag_bocw                          public.rag_status NOT NULL DEFAULT 'GREY',
  rag_labour_licence                public.rag_status NOT NULL DEFAULT 'GREY',
  rag_overall                       public.rag_status NOT NULL DEFAULT 'GREY',  -- worst of above

  -- ── Audit ───────────────────────────────────────────────────────────────
  reviewed_by                       TEXT,
  reviewed_at                       TIMESTAMPTZ,
  remarks                           TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS sc_project_status_idx
  ON public.statutory_clearances (project_id, rag_overall);

CREATE INDEX IF NOT EXISTS sc_work_order_idx
  ON public.statutory_clearances (project_id, work_order_ref);

CREATE INDEX IF NOT EXISTS sc_labour_expiry_idx
  ON public.statutory_clearances (labour_licence_expiry_date);

CREATE INDEX IF NOT EXISTS sc_final_clearance_idx
  ON public.statutory_clearances (project_id, final_clearance_status);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.sc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS sc_updated_at_trigger ON public.statutory_clearances;
CREATE TRIGGER sc_updated_at_trigger
  BEFORE UPDATE ON public.statutory_clearances
  FOR EACH ROW EXECUTE FUNCTION public.sc_set_updated_at();

-- RLS
ALTER TABLE public.statutory_clearances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_select_auth" ON public.statutory_clearances;
CREATE POLICY "sc_select_auth"
  ON public.statutory_clearances FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sc_insert_auth" ON public.statutory_clearances;
CREATE POLICY "sc_insert_auth"
  ON public.statutory_clearances FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sc_update_auth" ON public.statutory_clearances;
CREATE POLICY "sc_update_auth"
  ON public.statutory_clearances FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 5. TABLE: bocw_cess_ledger
--    Transaction-level BOCW Cess deduction and remittance log.
--    One row per RA bill payment or final bill payment where cess is deducted.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bocw_cess_ledger (
  -- Identity
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  statutory_clearance_id      TEXT        REFERENCES public.statutory_clearances(id) ON DELETE CASCADE,
  work_order_ref              TEXT        NOT NULL,
  contractor_name             TEXT        NOT NULL,

  -- Bill linkage
  transaction_type            public.bocw_transaction_type NOT NULL DEFAULT 'RA_BILL_DEDUCTION',
  bill_reference              TEXT,                   -- e.g. RA-2026-001, FINAL-BILL-01
  bill_date                   DATE,

  -- Amounts
  gross_bill_amount_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  cess_rate_pct               NUMERIC(5,2)  NOT NULL DEFAULT 1.00,
  cess_deducted_inr           NUMERIC(18,2) NOT NULL DEFAULT 0,  -- 1% of gross
  amount_remitted_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_inr                 NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Remittance proof
  challan_number              TEXT,
  challan_date                DATE,
  welfare_board_receipt_url   TEXT,

  -- Audit
  entered_by                  TEXT,
  remarks                     TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS bocw_project_idx
  ON public.bocw_cess_ledger (project_id);

CREATE INDEX IF NOT EXISTS bocw_sc_id_idx
  ON public.bocw_cess_ledger (statutory_clearance_id);

CREATE INDEX IF NOT EXISTS bocw_bill_date_idx
  ON public.bocw_cess_ledger (bill_date DESC);

CREATE INDEX IF NOT EXISTS bocw_work_order_idx
  ON public.bocw_cess_ledger (project_id, work_order_ref);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.bocw_ledger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS bocw_ledger_updated_at_trigger ON public.bocw_cess_ledger;
CREATE TRIGGER bocw_ledger_updated_at_trigger
  BEFORE UPDATE ON public.bocw_cess_ledger
  FOR EACH ROW EXECUTE FUNCTION public.bocw_ledger_set_updated_at();

-- RLS
ALTER TABLE public.bocw_cess_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bocw_select_auth" ON public.bocw_cess_ledger;
CREATE POLICY "bocw_select_auth"
  ON public.bocw_cess_ledger FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "bocw_insert_auth" ON public.bocw_cess_ledger;
CREATE POLICY "bocw_insert_auth"
  ON public.bocw_cess_ledger FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "bocw_update_auth" ON public.bocw_cess_ledger;
CREATE POLICY "bocw_update_auth"
  ON public.bocw_cess_ledger FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. Realtime publication
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'statutory_clearances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.statutory_clearances;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'bocw_cess_ledger'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bocw_cess_ledger;
  END IF;
END $$;

-- =============================================================================
-- End of migration: 20260917_statutory_clearance
-- =============================================================================
