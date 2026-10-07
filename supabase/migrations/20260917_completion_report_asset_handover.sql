-- =============================================================================
-- Migration: 20260917_completion_report_asset_handover
-- Module   : Project Completion Report (PCR), Final Cost Variance &
--            Facility Asset Handover
-- Ref      : CPWD Works Manual — Chapter on Completion Reports
--            FIDIC Red Book Clause 10 (Taking-Over)
--            FIDIC Red Book Clause 14.13 (Final Certificate)
--            IS 15883 (Commissioning of Electrical Installations)
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM: PCR workflow status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.pcr_status AS ENUM (
    'DRAFT',
    'SUBMITTED_TO_SEOR',
    'SEOR_REVIEWED',
    'SUBMITTED_TO_DIRECTOR',
    'DIRECTOR_APPROVED',
    'CLIENT_ACCEPTED',
    'GAZETTED'          -- final registry record stamped
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. ENUM: handover asset category
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.asset_category AS ENUM (
    'CIVIL_STRUCTURE',
    'MEP_HVAC',
    'ELECTRICAL',
    'PLUMBING_SANITATION',
    'FIRE_FIGHTING',
    'SECURITY_BMS',
    'ELEVATOR_ESCALATOR',
    'LANDSCAPE',
    'FURNITURE_FIXTURE',
    'SPECIALIST_EQUIPMENT',
    'IT_TELECOM',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. ENUM: asset handover status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.asset_handover_status AS ENUM (
    'PENDING',
    'DOCUMENTATION_SUBMITTED',
    'INSPECTION_DONE',
    'HANDED_OVER',
    'PUNCH_LISTED',     -- defects noted at handover
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. TABLE: project_completion_reports
--    One row per project/contract; the official PCR record.
--    Tracks sanctioned vs. actual financial heads, schedule performance,
--    LD levied, cost variances, and sign-off chain.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_completion_reports (
  -- Identity
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL UNIQUE,
  pcr_number                      TEXT        NOT NULL,       -- e.g. PCR/LKO/2026/001
  project_name                    TEXT        NOT NULL,
  project_location                TEXT,
  client_name                     TEXT        NOT NULL,
  contractor_name                 TEXT        NOT NULL,
  work_order_number               TEXT        NOT NULL,
  work_order_date                 DATE,

  -- ── Financial: Sanctioned / Tendered ──────────────────────────────────────
  sanctioned_amount_inr           NUMERIC(18,2) NOT NULL DEFAULT 0,
  tendered_amount_inr             NUMERIC(18,2) NOT NULL DEFAULT 0,
  loa_amount_inr                  NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- ── Financial: Actual Final ────────────────────────────────────────────────
  final_measured_value_inr        NUMERIC(18,2) NOT NULL DEFAULT 0,   -- e-MB certified
  total_ra_bills_paid_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,
  final_bill_net_payable_inr      NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_actual_expenditure_inr    NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- ── Variance by major head (CPWD head-wise breakdown) ─────────────────────
  var_substructure_sanctioned_inr   NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_substructure_actual_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_superstructure_sanctioned_inr NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_superstructure_actual_inr     NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_finishes_sanctioned_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_finishes_actual_inr           NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_mep_sanctioned_inr            NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_mep_actual_inr                NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_external_works_sanctioned_inr NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_external_works_actual_inr     NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_contingency_sanctioned_inr    NUMERIC(18,2) NOT NULL DEFAULT 0,
  var_contingency_actual_inr        NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- ── Deductions applied ────────────────────────────────────────────────────
  liquidated_damages_levied_inr   NUMERIC(18,2) NOT NULL DEFAULT 0,
  price_adjustment_credit_inr     NUMERIC(18,2) NOT NULL DEFAULT 0,
  variations_approved_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- ── Schedule Performance ──────────────────────────────────────────────────
  stipulated_completion_date      DATE,
  actual_completion_date          DATE,
  time_overrun_days               INTEGER       NOT NULL DEFAULT 0,
  approved_extension_days         INTEGER       NOT NULL DEFAULT 0,
  net_delay_days                  INTEGER       NOT NULL DEFAULT 0,   -- overrun – extension
  spi_value                       NUMERIC(6,4)  NOT NULL DEFAULT 1.0, -- Schedule Performance Index
  milestone_count_total           INTEGER       NOT NULL DEFAULT 0,
  milestone_count_achieved        INTEGER       NOT NULL DEFAULT 0,

  -- ── Taking-Over (FIDIC Cl. 10) ────────────────────────────────────────────
  toc_number                      TEXT,
  toc_issued_date                 DATE,
  toc_issued_by                   TEXT,
  practical_completion_confirmed  BOOLEAN       NOT NULL DEFAULT FALSE,

  -- ── PCR Sign-off chain ────────────────────────────────────────────────────
  status                          public.pcr_status NOT NULL DEFAULT 'DRAFT',
  seor_name                       TEXT,
  seor_submitted_date             DATE,
  seor_reviewed_date              DATE,
  seor_remarks                    TEXT,
  director_name                   TEXT,
  director_approved_date          DATE,
  director_remarks                TEXT,
  client_rep_name                 TEXT,
  client_accepted_date            DATE,
  client_remarks                  TEXT,

  -- ── Quality & defects ─────────────────────────────────────────────────────
  dlp_duration_months             INTEGER       NOT NULL DEFAULT 12,
  defects_at_handover_count       INTEGER       NOT NULL DEFAULT 0,
  defects_cleared_count           INTEGER       NOT NULL DEFAULT 0,

  -- ── Attachments ───────────────────────────────────────────────────────────
  as_built_drawing_url            TEXT,
  bim_model_url                   TEXT,
  photographic_record_url         TEXT,
  test_commissioning_report_url   TEXT,

  remarks                         TEXT,
  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS pcr_project_idx
  ON public.project_completion_reports (project_id);

CREATE INDEX IF NOT EXISTS pcr_status_idx
  ON public.project_completion_reports (status);

CREATE INDEX IF NOT EXISTS pcr_completion_date_idx
  ON public.project_completion_reports (actual_completion_date DESC);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.pcr_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS pcr_updated_at_trigger ON public.project_completion_reports;
CREATE TRIGGER pcr_updated_at_trigger
  BEFORE UPDATE ON public.project_completion_reports
  FOR EACH ROW EXECUTE FUNCTION public.pcr_set_updated_at();

-- RLS
ALTER TABLE public.project_completion_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pcr_select_auth" ON public.project_completion_reports;
CREATE POLICY "pcr_select_auth"
  ON public.project_completion_reports FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pcr_insert_auth" ON public.project_completion_reports;
CREATE POLICY "pcr_insert_auth"
  ON public.project_completion_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pcr_update_auth" ON public.project_completion_reports;
CREATE POLICY "pcr_update_auth"
  ON public.project_completion_reports FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 5. TABLE: facility_asset_handover
--    Per-asset permanent register for the handed-over facility.
--    Tracks serial/tag numbers, O&M links, warranty, test certs,
--    BIM integration flag, and handover status.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facility_asset_handover (
  -- Identity
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  pcr_id                          TEXT        REFERENCES public.project_completion_reports(id) ON DELETE SET NULL,
  asset_tag                       TEXT        NOT NULL,       -- e.g. ASSET-MEP-001
  asset_name                      TEXT        NOT NULL,
  asset_category                  public.asset_category NOT NULL DEFAULT 'OTHER',
  sub_category                    TEXT,                       -- e.g. "Air Handling Unit"
  make_model                      TEXT,
  manufacturer                    TEXT,
  serial_number                   TEXT,
  installation_location           TEXT,
  floor_zone                      TEXT,

  -- Financial
  asset_value_inr                 NUMERIC(18,2) NOT NULL DEFAULT 0,
  depreciation_rate_pct           NUMERIC(5,2)  NOT NULL DEFAULT 0,

  -- Warranty
  warranty_start_date             DATE,
  warranty_end_date               DATE,
  warranty_period_months          INTEGER,
  warranty_provider               TEXT,
  warranty_contact                TEXT,

  -- Documentation
  om_manual_url                   TEXT,                       -- O&M manual link
  test_cert_url                   TEXT,                       -- statutory test/commission cert
  as_built_ref                    TEXT,                       -- drawing/BIM ref
  bim_object_id                   TEXT,                       -- BIM GUID or element ID
  bim_integrated                  BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Handover
  status                          public.asset_handover_status NOT NULL DEFAULT 'PENDING',
  handover_date                   DATE,
  handed_over_by                  TEXT,
  received_by                     TEXT,
  client_signoff_date             DATE,
  punch_list_item                 TEXT,
  remarks                         TEXT,

  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS fah_project_idx
  ON public.facility_asset_handover (project_id);

CREATE INDEX IF NOT EXISTS fah_pcr_id_idx
  ON public.facility_asset_handover (pcr_id);

CREATE INDEX IF NOT EXISTS fah_category_idx
  ON public.facility_asset_handover (project_id, asset_category);

CREATE INDEX IF NOT EXISTS fah_status_idx
  ON public.facility_asset_handover (project_id, status);

CREATE INDEX IF NOT EXISTS fah_warranty_expiry_idx
  ON public.facility_asset_handover (warranty_end_date);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.fah_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS fah_updated_at_trigger ON public.facility_asset_handover;
CREATE TRIGGER fah_updated_at_trigger
  BEFORE UPDATE ON public.facility_asset_handover
  FOR EACH ROW EXECUTE FUNCTION public.fah_set_updated_at();

-- RLS
ALTER TABLE public.facility_asset_handover ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fah_select_auth" ON public.facility_asset_handover;
CREATE POLICY "fah_select_auth"
  ON public.facility_asset_handover FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fah_insert_auth" ON public.facility_asset_handover;
CREATE POLICY "fah_insert_auth"
  ON public.facility_asset_handover FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fah_update_auth" ON public.facility_asset_handover;
CREATE POLICY "fah_update_auth"
  ON public.facility_asset_handover FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. Realtime publication
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'project_completion_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_completion_reports;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'facility_asset_handover'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_asset_handover;
  END IF;
END $$;

-- =============================================================================
-- End of migration: 20260917_completion_report_asset_handover
-- =============================================================================
