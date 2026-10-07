-- =============================================================================
-- Migration: 20260917_vendor_performance_final_archive
-- Module   : Vendor Performance Evaluation, Final Ledger Settlement &
--            Project Archive
-- Ref      : CPWD Works Manual — Chapter on Contractor Rating & Debarment
--            FIDIC Red Book Clause 14.11 (Application for Final Payment Certificate)
--            FIDIC Red Book Clause 14.12 (Discharge)
--            FIDIC Red Book Clause 14.13 (Issue of Final Payment Certificate)
--            FIDIC Red Book Clause 14.14 (Cessation of Employer's Liability)
--            ISO 19650-2 (Project Closeout & Permanent Archive State)
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.vendor_rating_grade AS ENUM (
    'CLASS_A_PLUS', -- Score >= 85: Outstanding / Preferred
    'CLASS_A',      -- Score 70-84: Good / Qualified
    'CLASS_B',      -- Score 55-69: Fair / Conditional Monitoring
    'CLASS_C',      -- Score < 55: Deficient / Non-Responsive
    'DEBARRED'      -- Debarred / Disqualified
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vendor_listing_status AS ENUM (
    'WHITELISTED', -- Pre-qualified / Preferred Vendor
    'MONITORED',   -- Under performance watch
    'SUSPENDED',   -- Tendering temporarily suspended
    'BLACKLISTED'  -- Formally debarred per CPWD gazette guidelines
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.final_settlement_status AS ENUM (
    'DRAFT',               -- Initial calculation / reconciliation
    'UNDER_AUDIT',         -- Joint QS / Internal Audit verification
    'DISPUTED',            -- Disputed variation / claim pending
    'AGREED_FINAL',        -- Both parties concur on final amount
    'DISCHARGED_ARCHIVED'  -- FIDIC Cl. 14.12 signed, paid & archived
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.archive_dossier_type AS ENUM (
    'CONTRACT_DOSSIER',
    'AS_BUILT_BIM',
    'STATUTORY_CLEARANCE',
    'FINAL_ACCOUNT_CERTIFICATE',
    'COBIE_ASSET_REGISTRY',
    'DISCHARGE_UNDERTAKING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: vendor_performance_scores
--    Multi-parameter contractor scorecard per CPWD Works Manual guidelines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_performance_scores (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  vendor_id                       TEXT        NOT NULL,
  vendor_name                     TEXT        NOT NULL,
  trade_category                  TEXT        NOT NULL, -- Civil, MEP HVAC, Electrical, Facade, Finishing
  contract_reference              TEXT        NOT NULL,
  work_package_title              TEXT        NOT NULL,

  -- CPWD Evaluation Pillars (0 - 100 scales)
  quality_rating                  NUMERIC(5,2) NOT NULL DEFAULT 75.00, -- Weight 40%
  safety_compliance_score         NUMERIC(5,2) NOT NULL DEFAULT 80.00, -- Weight 25% (BOCW/PPE/LTIFR)
  schedule_adherence              NUMERIC(5,2) NOT NULL DEFAULT 70.00, -- Weight 20% (SPI/Milestone delivery)
  dispute_commercial_score        NUMERIC(5,2) NOT NULL DEFAULT 85.00, -- Weight 15% (e-MB timeliness & disputes)

  -- Detailed Supporting Metrics
  ncr_count_total                 INTEGER      NOT NULL DEFAULT 0,
  ncr_count_cleared               INTEGER      NOT NULL DEFAULT 0,
  fatal_accidents_count           INTEGER      NOT NULL DEFAULT 0,
  bocw_cess_compliant             BOOLEAN      NOT NULL DEFAULT TRUE,
  ppe_audit_score_pct             NUMERIC(5,2) NOT NULL DEFAULT 85.00,
  milestone_delivery_pct          NUMERIC(5,2) NOT NULL DEFAULT 85.00,
  dispute_history_count           INTEGER      NOT NULL DEFAULT 0,
  arbitration_claims_inr          NUMERIC(18,2) NOT NULL DEFAULT 0.00,

  -- Computed Composite Score (0 - 100)
  weighted_composite_score        NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  rating_grade                    public.vendor_rating_grade NOT NULL DEFAULT 'CLASS_A',
  listing_status                  public.vendor_listing_status NOT NULL DEFAULT 'WHITELISTED',

  -- Governance & Blacklisting Details
  blacklist_reason                TEXT,
  blacklisted_by                  TEXT,
  blacklisted_at                  TIMESTAMPTZ,
  debarment_tenure_months         INTEGER      DEFAULT 0,
  evaluated_by                    TEXT        NOT NULL DEFAULT 'PMC Project Lead',
  evaluated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluation_quarter              TEXT        NOT NULL DEFAULT 'Q4-2025/26',
  evaluation_notes                TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vps_unique_project_vendor UNIQUE (project_id, vendor_id, evaluation_quarter)
);

-- Indexes for vendor_performance_scores
CREATE INDEX IF NOT EXISTS vps_project_idx ON public.vendor_performance_scores (project_id);
CREATE INDEX IF NOT EXISTS vps_vendor_idx ON public.vendor_performance_scores (vendor_id);
CREATE INDEX IF NOT EXISTS vps_listing_idx ON public.vendor_performance_scores (project_id, listing_status);
CREATE INDEX IF NOT EXISTS vps_grade_idx ON public.vendor_performance_scores (rating_grade);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION public.vps_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS vps_updated_at_trigger ON public.vendor_performance_scores;
CREATE TRIGGER vps_updated_at_trigger
  BEFORE UPDATE ON public.vendor_performance_scores
  FOR EACH ROW EXECUTE FUNCTION public.vps_set_updated_at();

-- RLS
ALTER TABLE public.vendor_performance_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vps_select_all" ON public.vendor_performance_scores;
CREATE POLICY "vps_select_all"
  ON public.vendor_performance_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "vps_insert_auth" ON public.vendor_performance_scores;
CREATE POLICY "vps_insert_auth"
  ON public.vendor_performance_scores FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "vps_update_auth" ON public.vendor_performance_scores;
CREATE POLICY "vps_update_auth"
  ON public.vendor_performance_scores FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. TABLE: vendor_final_accounts
--    FIDIC Red Book Clause 14.11 & 14.13 Final Account Ledger & Reconciliation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_final_accounts (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  vendor_id                       TEXT        NOT NULL,
  vendor_name                     TEXT        NOT NULL,
  contract_ref                    TEXT        NOT NULL, -- e.g. QL-CON-2025-01
  work_order_number               TEXT        NOT NULL,
  trade_category                  TEXT        NOT NULL,

  -- Financial Breakdown (INR)
  total_awarded_value             NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Original Contract Amount (LOA)
  approved_variations             NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Net variations (+/-)
  price_escalation_inr            NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Clause 13.8 Price Adjustment
  total_gross_billable_value      NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Awarded + Variations + Escalation

  -- Deductions & Adjustments
  retention_deducted_inr          NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  retention_released_inr          NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  liquidated_damages_applied      NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- LD for schedule default
  statutory_deductions_inr        NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- TDS, GST TDS, Labour Cess
  material_reconciliation_debit   NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Cement/Steel over-consumption debit

  -- Disbursement Reconciliation
  cumulative_paid_to_date         NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Total RA Bills / IPCs paid
  final_net_billable              NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Gross less LD, Debits, Deductions
  final_paid_amount               NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Final payment tranche
  balance_due_or_refund           NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- (+ payable to vendor, - refund to employer)

  -- Settlement & Statutory Discharge Status
  settlement_status               public.final_settlement_status NOT NULL DEFAULT 'UNDER_AUDIT',
  fidic_clause_14_12_discharged   BOOLEAN       NOT NULL DEFAULT FALSE, -- Signed Discharge undertaking
  discharge_certificate_number    TEXT,
  discharged_at                   TIMESTAMPTZ,
  discharged_by                   TEXT,
  contractor_signatory_name       TEXT,
  contractor_signatory_designation TEXT,
  employer_signatory_name         TEXT,
  settlement_notes                TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vfa_unique_contract UNIQUE (project_id, contract_ref)
);

-- Indexes for vendor_final_accounts
CREATE INDEX IF NOT EXISTS vfa_project_idx ON public.vendor_final_accounts (project_id);
CREATE INDEX IF NOT EXISTS vfa_vendor_idx ON public.vendor_final_accounts (vendor_id);
CREATE INDEX IF NOT EXISTS vfa_status_idx ON public.vendor_final_accounts (project_id, settlement_status);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION public.vfa_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS vfa_updated_at_trigger ON public.vendor_final_accounts;
CREATE TRIGGER vfa_updated_at_trigger
  BEFORE UPDATE ON public.vendor_final_accounts
  FOR EACH ROW EXECUTE FUNCTION public.vfa_set_updated_at();

-- RLS
ALTER TABLE public.vendor_final_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vfa_select_all" ON public.vendor_final_accounts;
CREATE POLICY "vfa_select_all"
  ON public.vendor_final_accounts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "vfa_insert_auth" ON public.vendor_final_accounts;
CREATE POLICY "vfa_insert_auth"
  ON public.vendor_final_accounts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "vfa_update_auth" ON public.vendor_final_accounts;
CREATE POLICY "vfa_update_auth"
  ON public.vendor_final_accounts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. TABLE: project_archive_logs
--    Permanent ISO 19650 Project Archive & Audit Hash Vault
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_archive_logs (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  vendor_id                       TEXT,
  archive_dossier_type            public.archive_dossier_type NOT NULL,
  archive_reference               TEXT        NOT NULL, -- e.g. QL-ARC-2026-DOSSIER-01
  title                           TEXT        NOT NULL,
  file_url                        TEXT,
  file_size_bytes                 BIGINT      DEFAULT 0,
  file_hash_sha256                TEXT        NOT NULL, -- SHA-256 for legal evidentiary integrity
  cde_state                       TEXT        NOT NULL DEFAULT 'Archived', -- ISO 19650
  retention_period_years          INTEGER     NOT NULL DEFAULT 10,
  legal_custody_officer           TEXT        NOT NULL DEFAULT 'Lead Legal Counsel & CDE Manager',
  archived_by                     TEXT        NOT NULL DEFAULT 'PMC Project Lead',
  archived_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_payload                JSONB       DEFAULT '{}'::jsonb,
  is_tamper_verified              BOOLEAN     NOT NULL DEFAULT TRUE,
  archive_notes                   TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for project_archive_logs
CREATE INDEX IF NOT EXISTS pal_project_idx ON public.project_archive_logs (project_id);
CREATE INDEX IF NOT EXISTS pal_vendor_idx ON public.project_archive_logs (vendor_id);
CREATE INDEX IF NOT EXISTS pal_type_idx ON public.project_archive_logs (project_id, archive_dossier_type);
CREATE INDEX IF NOT EXISTS pal_hash_idx ON public.project_archive_logs (file_hash_sha256);

-- RLS
ALTER TABLE public.project_archive_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pal_select_all" ON public.project_archive_logs;
CREATE POLICY "pal_select_all"
  ON public.project_archive_logs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "pal_insert_auth" ON public.project_archive_logs;
CREATE POLICY "pal_insert_auth"
  ON public.project_archive_logs FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. Realtime Publication Registration
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'vendor_performance_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_performance_scores;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'vendor_final_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_final_accounts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'project_archive_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_archive_logs;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. SEED DATA (Idempotent UPSERTs for Commercial & Residential Projects)
-- ---------------------------------------------------------------------------

-- 6.1 Vendor Performance Scores
INSERT INTO public.vendor_performance_scores (
  id, project_id, vendor_id, vendor_name, trade_category, contract_reference, work_package_title,
  quality_rating, safety_compliance_score, schedule_adherence, dispute_commercial_score,
  ncr_count_total, ncr_count_cleared, fatal_accidents_count, bocw_cess_compliant, ppe_audit_score_pct,
  milestone_delivery_pct, dispute_history_count, arbitration_claims_inr,
  weighted_composite_score, rating_grade, listing_status,
  evaluated_by, evaluation_quarter, evaluation_notes
) VALUES
(
  'vps-001', 'PRJ-LKO-TOWER-A', 'VND-APEX-01', 'Apex Structural Infrastructure Ltd',
  'Civil & Structural Works', 'QL-CTR-2024-CIV-01', 'Tower A Substructure & Superstructure Concrete Works',
  92.50, 94.00, 88.00, 95.00,
  14, 14, 0, TRUE, 96.00,
  95.00, 0, 0.00,
  92.35, 'CLASS_A_PLUS', 'WHITELISTED',
  'Principal Structural Engineer (SEOR)', 'Q4-2025/26',
  'Exceptional structural concrete execution adhering to IS 456. Zero fatal incidents and 100% NCR clearance rate.'
),
(
  'vps-002', 'PRJ-LKO-TOWER-A', 'VND-THERMO-02', 'ThermoTech Engineering Solutions Pvt Ltd',
  'MEP & HVAC Works', 'QL-CTR-2024-MEP-03', 'Central HVAC Chillers, VRV & Ventilation Systems',
  86.00, 88.50, 82.00, 90.00,
  8, 8, 0, TRUE, 90.00,
  90.00, 0, 0.00,
  86.43, 'CLASS_A_PLUS', 'WHITELISTED',
  'Senior MEP Consultant', 'Q4-2025/26',
  'Commissioned chillers and AHUs smoothly. Factory acceptance tests (FAT) fully documented.'
),
(
  'vps-003', 'PRJ-LKO-TOWER-A', 'VND-STERLING-03', 'Sterling Architectural Facades India Ltd',
  'Facade & Curtain Glazing', 'QL-CTR-2024-FAC-02', 'Unitized Double-Glazed Curtain Wall & Louvers',
  78.00, 72.00, 64.00, 70.00,
  19, 17, 0, TRUE, 78.00,
  70.00, 1, 1450000.00,
  72.50, 'CLASS_A', 'MONITORED',
  'Lead Architect of Record (AOR)', 'Q4-2025/26',
  'Delivery delays on imported extruded aluminum profiles. Minor water seepage snag in wind-pressure testing requiring rectification.'
),
(
  'vps-004', 'PRJ-LKO-TOWER-A', 'VND-SHAKTI-04', 'Shakti High-Tension Electricals & Switchgears',
  'Electrical & Substation', 'QL-CTR-2024-ELE-04', '11kV Substation, Transformers, DG Sets & HT Panels',
  84.00, 89.00, 85.00, 88.00,
  5, 5, 0, TRUE, 92.00,
  88.00, 0, 0.00,
  86.05, 'CLASS_A_PLUS', 'WHITELISTED',
  'Electrical Inspector of Record', 'Q4-2025/26',
  'Successful CEA statutory energization clearance achieved within target shutdown window.'
),
(
  'vps-005', 'PRJ-LKO-TOWER-A', 'VND-ZENITH-05', 'Zenith Interior Joinery & Drywalls',
  'Finishes & Interiors', 'QL-CTR-2024-FIN-05', 'Acoustic Ceilings, Drywall Partitions & Millwork',
  52.00, 58.00, 48.00, 50.00,
  31, 22, 0, FALSE, 65.00,
  55.00, 2, 4200000.00,
  52.40, 'CLASS_C', 'SUSPENDED',
  'PMC Project Lead', 'Q4-2025/26',
  'Critical labor cess non-compliance and recurring surface waviness defects on drywalls. Tendering access suspended.'
),
(
  'vps-006', 'PRJ-1BHK-GOMTI', 'VND-GOMTI-CIV-01', 'Awadh Buildcon & Fitout Contractors',
  'Civil & Interior Fit-Out', 'QL-CTR-2025-RES-01', '1BHK Luxury Apartment Turnkey Interior Fit-Out',
  91.00, 93.00, 89.00, 92.00,
  3, 3, 0, TRUE, 94.00,
  92.00, 0, 0.00,
  91.25, 'CLASS_A_PLUS', 'WHITELISTED',
  'Lead Interior Architect', 'Q4-2025/26',
  'Exemplary bespoke joinery and flawless tile alignment. Completed 12 days ahead of stipulated handover.'
)
ON CONFLICT (project_id, vendor_id, evaluation_quarter)
DO UPDATE SET
  quality_rating = EXCLUDED.quality_rating,
  safety_compliance_score = EXCLUDED.safety_compliance_score,
  schedule_adherence = EXCLUDED.schedule_adherence,
  dispute_commercial_score = EXCLUDED.dispute_commercial_score,
  weighted_composite_score = EXCLUDED.weighted_composite_score,
  rating_grade = EXCLUDED.rating_grade,
  listing_status = EXCLUDED.listing_status,
  updated_at = NOW();

-- 6.2 Vendor Final Accounts (FIDIC Cl. 14.11 / 14.13)
INSERT INTO public.vendor_final_accounts (
  id, project_id, vendor_id, vendor_name, contract_ref, work_order_number, trade_category,
  total_awarded_value, approved_variations, price_escalation_inr, total_gross_billable_value,
  retention_deducted_inr, retention_released_inr, liquidated_damages_applied, statutory_deductions_inr,
  material_reconciliation_debit, cumulative_paid_to_date, final_net_billable, final_paid_amount,
  balance_due_or_refund, settlement_status, fidic_clause_14_12_discharged, discharge_certificate_number,
  discharged_at, discharged_by, contractor_signatory_name, contractor_signatory_designation,
  employer_signatory_name, settlement_notes
) VALUES
(
  'vfa-001', 'PRJ-LKO-TOWER-A', 'VND-APEX-01', 'Apex Structural Infrastructure Ltd',
  'QL-CTR-2024-CIV-01', 'WO/LKO/CIV/24/001', 'Civil & Structural Works',
  145000000.00, 8450000.00, 3200000.00, 156650000.00,
  7832500.00, 7832500.00, 0.00, 4699500.00,
  425000.00, 142800000.00, 151525500.00, 8725500.00,
  0.00, 'DISCHARGED_ARCHIVED', TRUE, 'DISCHARGE/LKO/CIV/2026/01',
  '2026-03-12 11:30:00+05:30', 'Director of Works, PMC', 'Er. Rajeshwar Nath Tripathi', 'Managing Director, Apex Infra',
  'Sanjay Verma (Head of Contracts, Quadillar)',
  'Full and final settlement executed under FIDIC Clause 14.12. All retention released post-DLP clearance.'
),
(
  'vfa-002', 'PRJ-LKO-TOWER-A', 'VND-THERMO-02', 'ThermoTech Engineering Solutions Pvt Ltd',
  'QL-CTR-2024-MEP-03', 'WO/LKO/MEP/24/003', 'MEP & HVAC Works',
  52000000.00, 2800000.00, 950000.00, 55750000.00,
  2787500.00, 1393750.00, 0.00, 1672500.00,
  0.00, 49800000.00, 54077500.00, 2883750.00,
  1393750.00, 'AGREED_FINAL', FALSE, NULL,
  NULL, NULL, 'K. S. Ranganathan', 'Vice President Projects',
  'Sanjay Verma (Head of Contracts)',
  '50% retention released upon Taking-Over. Balance 50% (₹13.93 L) scheduled for release post-DLP warranty expiry.'
),
(
  'vfa-003', 'PRJ-LKO-TOWER-A', 'VND-STERLING-03', 'Sterling Architectural Facades India Ltd',
  'QL-CTR-2024-FAC-02', 'WO/LKO/FAC/24/002', 'Facade & Curtain Glazing',
  38000000.00, -1200000.00, 450000.00, 37250000.00,
  1862500.00, 0.00, 950000.00, 1117500.00,
  180000.00, 32100000.00, 35002500.00, 2902500.00,
  0.00, 'UNDER_AUDIT', FALSE, NULL,
  NULL, NULL, 'Mukul Mathur', 'General Manager Commercial',
  'Sanjay Verma (Head of Contracts)',
  'Liquidated damages of ₹9.50 L applied for 19 days unapproved facade completion delay. Under final audit review.'
),
(
  'vfa-004', 'PRJ-LKO-TOWER-A', 'VND-SHAKTI-04', 'Shakti High-Tension Electricals & Switchgears',
  'QL-CTR-2024-ELE-04', 'WO/LKO/ELE/24/004', 'Electrical & Substation',
  28500000.00, 1420000.00, 580000.00, 30500000.00,
  1525000.00, 1525000.00, 0.00, 915000.00,
  0.00, 27600000.00, 29585000.00, 1985000.00,
  0.00, 'DISCHARGED_ARCHIVED', TRUE, 'DISCHARGE/LKO/ELE/2026/04',
  '2026-03-08 14:00:00+05:30', 'Executive Engineer (Electrical), PMC', 'Arun K. Srivastava', 'Partner, Shakti Electricals',
  'Sanjay Verma (Head of Contracts)',
  'Statutory electrical inspectorate clearance verified. Zero outstanding claims or punch items.'
),
(
  'vfa-005', 'PRJ-1BHK-GOMTI', 'VND-GOMTI-CIV-01', 'Awadh Buildcon & Fitout Contractors',
  'QL-CTR-2025-RES-01', 'WO/GOMTI/FIT/25/001', 'Civil & Interior Fit-Out',
  4850000.00, 240000.00, 0.00, 5090000.00,
  254500.00, 254500.00, 0.00, 152700.00,
  0.00, 4600000.00, 4937300.00, 337300.00,
  0.00, 'DISCHARGED_ARCHIVED', TRUE, 'DISCHARGE/GOMTI/RES/2026/01',
  '2026-03-01 16:45:00+05:30', 'Principal Architect', 'Mohammad Tariq', 'Proprietor, Awadh Buildcon',
  'Akshat Singh (Project Director)',
  'Turnkey interior fitout finished to superlative standard. 100% payments completed and signed undertaking archived.'
)
ON CONFLICT (project_id, contract_ref)
DO UPDATE SET
  total_awarded_value = EXCLUDED.total_awarded_value,
  approved_variations = EXCLUDED.approved_variations,
  price_escalation_inr = EXCLUDED.price_escalation_inr,
  total_gross_billable_value = EXCLUDED.total_gross_billable_value,
  retention_deducted_inr = EXCLUDED.retention_deducted_inr,
  retention_released_inr = EXCLUDED.retention_released_inr,
  liquidated_damages_applied = EXCLUDED.liquidated_damages_applied,
  cumulative_paid_to_date = EXCLUDED.cumulative_paid_to_date,
  balance_due_or_refund = EXCLUDED.balance_due_or_refund,
  settlement_status = EXCLUDED.settlement_status,
  fidic_clause_14_12_discharged = EXCLUDED.fidic_clause_14_12_discharged,
  updated_at = NOW();

-- 6.3 Project Archive Logs (ISO 19650 Permanent Archive)
INSERT INTO public.project_archive_logs (
  id, project_id, vendor_id, archive_dossier_type, archive_reference, title,
  file_url, file_size_bytes, file_hash_sha256, cde_state, retention_period_years,
  legal_custody_officer, archived_by, archived_at, metadata_payload, is_tamper_verified, archive_notes
) VALUES
(
  'pal-001', 'PRJ-LKO-TOWER-A', 'VND-APEX-01', 'FINAL_ACCOUNT_CERTIFICATE',
  'QL-ARC-2026-APEX-FAC', 'Apex Structural Final Account Certificate & FIDIC Cl 14.12 Discharge',
  '/archive/contracts/apex_final_account_signed.pdf', 1482910,
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'Archived', 10, 'Adv. R. C. Mathur (Chief Legal Custodian)', 'PMC Project Lead',
  '2026-03-12 12:00:00+05:30',
  '{"contract_ref": "QL-CTR-2024-CIV-01", "gross_amount_inr": 156650000, "emb_final_page": 842, "retention_status": "FULLY_RELEASED"}'::jsonb,
  TRUE, 'Legally binding signed discharge certificate stored in encrypted vault storage.'
),
(
  'pal-002', 'PRJ-LKO-TOWER-A', 'VND-APEX-01', 'AS_BUILT_BIM',
  'QL-ARC-2026-APEX-BIM', 'Tower A Core & Shell As-Built IFC4 BIM Model & Structural Calcs',
  '/archive/bim/tower_a_structural_asbuilt_v3.ifc', 89452100,
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  'Archived', 15, 'Adv. R. C. Mathur (Chief Legal Custodian)', 'Lead BIM Coordinator',
  '2026-03-12 12:15:00+05:30',
  '{"lod": "LOD-500", "software": "Revit 2026", "elements_count": 48200, "cobie_validated": true}'::jsonb,
  TRUE, 'LOD-500 as-built model reconciled with final site drone photogrammetry laser scans.'
),
(
  'pal-003', 'PRJ-LKO-TOWER-A', 'VND-SHAKTI-04', 'STATUTORY_CLEARANCE',
  'QL-ARC-2026-SHAKTI-CEA', 'Central Electricity Authority (CEA) Energization Clearance & Test Certs',
  '/archive/statutory/cea_energization_approval_lko.pdf', 2411080,
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  'Archived', 10, 'Adv. R. C. Mathur (Chief Legal Custodian)', 'Resident Electrical Engineer',
  '2026-03-08 15:30:00+05:30',
  '{"authority": "CEA Uttar Pradesh", "permit_no": "UP-CEA-2026-4402", "voltage_grade": "11kV / 433V"}'::jsonb,
  TRUE, 'Statutory safety approval for commercial energization.'
),
(
  'pal-004', 'PRJ-LKO-TOWER-A', 'VND-THERMO-02', 'COBIE_ASSET_REGISTRY',
  'QL-ARC-2026-HVAC-COBIE', 'COBie v2.4 Handover Asset Registry for HVAC & Plant Equipment',
  '/archive/cobie/mep_chillers_cobie_v24.xlsx', 4120900,
  '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
  'Archived', 10, 'Adv. R. C. Mathur (Chief Legal Custodian)', 'Commissioning Authority (CxA)',
  '2026-03-10 10:00:00+05:30',
  '{"assets_catalogued": 184, "warranty_tracker_active": true, "fm_system": "Maximo"}'::jsonb,
  TRUE, 'Complete digital twin and CAFM asset parameter registry for building operations.'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- End of migration: 20260917_vendor_performance_final_archive
-- =============================================================================
