-- =============================================================================
-- Migration: 20260917_dlp_pbg_tracker
-- Module   : DLP & Performance Bank Guarantee Release Tracker
-- Ref      : CPWD GCC Clause 17 / FIDIC Red Book Clause 11 & 4.2
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM: PBG / Bank Guarantee status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.pbg_status AS ENUM (
    'ACTIVE',
    'EXPIRING_SOON',      -- within 30 days of expiry
    'EXTENDED',
    'CALLED_UPON',        -- invoked/encashed by employer
    'RELEASED',
    'EXPIRED_LAPSED',
    'REPLACED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. ENUM: DLP defect severity
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.dlp_defect_severity AS ENUM (
    'STRUCTURAL',         -- safety-critical, stop-work implications
    'MAJOR',              -- significant functional impact
    'MINOR',              -- cosmetic / snag-list item
    'COSMETIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. ENUM: DLP defect rectification status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.dlp_defect_status AS ENUM (
    'OPEN',
    'NOTIFIED',           -- formal notice issued to contractor
    'IN_RECTIFICATION',
    'RECTIFIED',
    'VERIFIED_CLOSED',
    'DEFAULTED',          -- contractor failed to rectify; penalty applied
    'DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. ENUM: DLP contract status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.dlp_contract_status AS ENUM (
    'DLP_RUNNING',
    'DLP_EXPIRED_CLEARANCE_PENDING',
    'DLP_CLEARED_ZERO_DEFECTS',
    'PBG_RELEASED',
    'ARBITRATION_HOLD'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 5. TABLE: project_bank_guarantees
--    Tracks all PBGs / Performance Security instruments per FIDIC Cl. 4.2
--    and CPWD GCC Clause 1 (Security Deposit / Performance Bond).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_bank_guarantees (
  -- Identity
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  work_order_ref              TEXT        NOT NULL,
  contractor_name             TEXT        NOT NULL,
  trade_package               TEXT,

  -- Instrument details
  guarantee_type              TEXT        NOT NULL DEFAULT 'PERFORMANCE_SECURITY',
    -- e.g. PERFORMANCE_SECURITY | ADVANCE_PAYMENT_GUARANTEE | RETENTION_BG | DLP_BG
  bg_number                   TEXT        NOT NULL,           -- bank guarantee instrument number
  issuing_bank_name           TEXT        NOT NULL,
  issuing_bank_branch         TEXT,
  beneficiary_name            TEXT        NOT NULL DEFAULT 'Project Employer',

  -- Financial
  guarantee_amount_inr        NUMERIC(18,2) NOT NULL DEFAULT 0,
  original_contract_value_inr NUMERIC(18,2) NOT NULL DEFAULT 0,
  guarantee_pct_of_contract   NUMERIC(5,2)  NOT NULL DEFAULT 5.00,  -- typically 5-10%

  -- Dates
  issue_date                  DATE        NOT NULL,
  validity_start_date         DATE        NOT NULL,
  validity_expiry_date        DATE        NOT NULL,
  dlp_end_date                DATE,           -- must be valid through DLP end
  extension_validity_date     DATE,           -- if extended
  actual_release_date         DATE,

  -- Status
  status                      public.pbg_status NOT NULL DEFAULT 'ACTIVE',

  -- DLP linkage
  toc_reference               TEXT,           -- Taking-Over Certificate linking DLP start
  toc_date                    DATE,
  dlp_duration_months         INTEGER     NOT NULL DEFAULT 12,
  dlp_computed_expiry         DATE,           -- toc_date + dlp_duration_months

  -- Release gate
  zero_defect_signoff         BOOLEAN     NOT NULL DEFAULT FALSE,
  zero_defect_signoff_by      TEXT,
  zero_defect_signoff_at      TIMESTAMPTZ,
  release_auth_by             TEXT,           -- engineer/SEOR authorising release
  release_auth_at             TIMESTAMPTZ,
  release_letter_ref          TEXT,

  -- Called / Invoked
  called_upon_reason          TEXT,
  called_upon_amount_inr      NUMERIC(18,2),
  called_upon_at              TIMESTAMPTZ,

  -- Notes
  remarks                     TEXT,
  document_url                TEXT,           -- scanned BG document link

  -- Audit
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pbg_unique_bg_number UNIQUE (project_id, bg_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS pbg_project_status_idx
  ON public.project_bank_guarantees (project_id, status);

CREATE INDEX IF NOT EXISTS pbg_expiry_idx
  ON public.project_bank_guarantees (validity_expiry_date);

CREATE INDEX IF NOT EXISTS pbg_dlp_expiry_idx
  ON public.project_bank_guarantees (dlp_computed_expiry);

CREATE INDEX IF NOT EXISTS pbg_work_order_idx
  ON public.project_bank_guarantees (project_id, work_order_ref);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.pbg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS pbg_updated_at_trigger ON public.project_bank_guarantees;
CREATE TRIGGER pbg_updated_at_trigger
  BEFORE UPDATE ON public.project_bank_guarantees
  FOR EACH ROW EXECUTE FUNCTION public.pbg_set_updated_at();

-- RLS
ALTER TABLE public.project_bank_guarantees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pbg_select_auth" ON public.project_bank_guarantees;
CREATE POLICY "pbg_select_auth"
  ON public.project_bank_guarantees FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pbg_insert_auth" ON public.project_bank_guarantees;
CREATE POLICY "pbg_insert_auth"
  ON public.project_bank_guarantees FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pbg_update_auth" ON public.project_bank_guarantees;
CREATE POLICY "pbg_update_auth"
  ON public.project_bank_guarantees FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. TABLE: dlp_defects
--    Per-defect tracking ledger during Defects Liability Period.
--    Ref: FIDIC Cl. 11.1 / CPWD GCC Cl. 17 — Contractor obligation to
--         rectify notified defects within the DLP.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dlp_defects (
  -- Identity
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  bank_guarantee_id           TEXT        REFERENCES public.project_bank_guarantees(id) ON DELETE SET NULL,
  work_order_ref              TEXT        NOT NULL,
  defect_number               TEXT        NOT NULL,   -- e.g. DLP-DEF-2026-001

  -- Defect description
  description                 TEXT        NOT NULL,
  location_zone               TEXT,
  element                     TEXT,               -- e.g. "Column C7", "RCC Slab Level 3"
  trade_discipline            TEXT,               -- Civil, MEP, Finishing, etc.
  severity                    public.dlp_defect_severity NOT NULL DEFAULT 'MINOR',

  -- Discovery & notification
  discovered_date             DATE        NOT NULL DEFAULT CURRENT_DATE,
  discovered_by               TEXT,
  notification_date           DATE,               -- formal notice to contractor
  notice_reference            TEXT,               -- e.g. "DN-DLP-2026-001"
  rectification_deadline_days INTEGER     NOT NULL DEFAULT 28,  -- per FIDIC Cl. 11.1
  rectification_due_date      DATE,               -- computed deadline

  -- Assignment
  assigned_contractor         TEXT        NOT NULL,
  assigned_to_person          TEXT,

  -- Status & resolution
  status                      public.dlp_defect_status NOT NULL DEFAULT 'OPEN',
  rectified_date              DATE,
  rectified_by                TEXT,
  inspector_verified_date     DATE,
  inspector_name              TEXT,
  closure_certificate_ref     TEXT,

  -- Defaulted / penalty
  is_defaulted                BOOLEAN     NOT NULL DEFAULT FALSE,
  penalty_deduction_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  penalty_applied_at          TIMESTAMPTZ,
  penalty_notes               TEXT,

  -- Evidence
  photo_before_url            TEXT,
  photo_after_url             TEXT,
  inspection_report_url       TEXT,

  -- Audit
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS dlp_project_status_idx
  ON public.dlp_defects (project_id, status);

CREATE INDEX IF NOT EXISTS dlp_severity_idx
  ON public.dlp_defects (project_id, severity);

CREATE INDEX IF NOT EXISTS dlp_bg_id_idx
  ON public.dlp_defects (bank_guarantee_id);

CREATE INDEX IF NOT EXISTS dlp_due_date_idx
  ON public.dlp_defects (rectification_due_date);

CREATE INDEX IF NOT EXISTS dlp_work_order_idx
  ON public.dlp_defects (project_id, work_order_ref);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.dlp_defects_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS dlp_defects_updated_at_trigger ON public.dlp_defects;
CREATE TRIGGER dlp_defects_updated_at_trigger
  BEFORE UPDATE ON public.dlp_defects
  FOR EACH ROW EXECUTE FUNCTION public.dlp_defects_set_updated_at();

-- RLS
ALTER TABLE public.dlp_defects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dlp_select_auth" ON public.dlp_defects;
CREATE POLICY "dlp_select_auth"
  ON public.dlp_defects FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "dlp_insert_auth" ON public.dlp_defects;
CREATE POLICY "dlp_insert_auth"
  ON public.dlp_defects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "dlp_update_auth" ON public.dlp_defects;
CREATE POLICY "dlp_update_auth"
  ON public.dlp_defects FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 7. Realtime publication
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'project_bank_guarantees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_bank_guarantees;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'dlp_defects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dlp_defects;
  END IF;
END $$;

-- =============================================================================
-- End of migration: 20260917_dlp_pbg_tracker
-- =============================================================================
