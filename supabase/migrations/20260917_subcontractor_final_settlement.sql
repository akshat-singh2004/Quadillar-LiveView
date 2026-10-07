-- =============================================================================
-- Migration: 20260917_subcontractor_final_settlement
-- Module   : Subcontractor Final Settlement & Labour Clearance Portal
-- Ref      : CPWD GCC Subcontractor Payment Guidelines & Clause 45
--            Inter-State Migrant Workmen (Regulation of Employment and
--            Conditions of Service) Act, 1979 (Sections 12, 14, 15)
--            Building and Other Construction Workers (BOCW) Act, 1996
--            Employees' Provident Funds & Miscellaneous Provisions Act, 1952
--            Employees' State Insurance Act, 1948
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.subcontractor_settlement_status AS ENUM (
    'DRAFT_AUDIT',
    'LABOUR_CLEARANCE_PENDING',
    'COMMERCIAL_REVIEW',
    'APPROVED_FOR_PAYMENT',
    'SETTLED_DISCHARGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wage_clearance_status AS ENUM (
    'PENDING',
    'PARTIAL_DISPUTE',
    'VERIFIED_CLEARED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.undertaking_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'LEGAL_VERIFIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: subcontractor_settlements
--    Full commercial reconciliation of subcontractor contracts and recoveries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcontractor_settlements (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  work_order_ref                  TEXT        NOT NULL,
  trade_package                   TEXT        NOT NULL,
  subcontractor_name              TEXT        NOT NULL,
  subcontractor_pan               TEXT,
  subcontractor_gstin             TEXT,

  -- Commercial Claims (INR)
  contract_wo_value_inr           NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  measured_final_qty_value_inr    NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- From certified Measurement Book (MB)
  approved_variations_inr         NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Extra items / deviation orders
  gross_final_claim_inr           NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- measured + variations

  -- Deductions & Recoveries (INR)
  previous_ra_disbursed_inr       NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Prior running account bill payments
  material_advances_recovered_inr NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Cement/steel or mobilization advance
  tool_plant_rentals_inr          NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Crane, hoist, shuttering rental
  contra_backcharges_inr          NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Backcharges for rework or damages
  site_utility_accommodation_inr  NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Labour camp, power & water utility
  retention_held_inr              NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Retention money held (post-DLP release)
  statutory_tax_withheld_inr      NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- TDS 194C + GST TDS 2%
  total_deductions_inr            NUMERIC(18,2) NOT NULL DEFAULT 0.00,

  -- Net Settlement Balance (INR)
  net_payable_balance_inr         NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Gross Claim - Total Deductions

  -- Workflow & Sign-Off Status
  settlement_status               public.subcontractor_settlement_status NOT NULL DEFAULT 'DRAFT_AUDIT',

  -- Dual-Key Authorization
  site_supervisor_signed          BOOLEAN       NOT NULL DEFAULT FALSE,
  site_supervisor_name            TEXT,
  site_supervisor_signed_at       TIMESTAMPTZ,
  site_supervisor_remarks         TEXT,

  commercial_head_signed          BOOLEAN       NOT NULL DEFAULT FALSE,
  commercial_head_name            TEXT,
  commercial_head_signed_at       TIMESTAMPTZ,
  commercial_head_remarks         TEXT,

  -- Voucher & Closure
  clearance_voucher_number        TEXT,
  settlement_date                 DATE,
  notes                           TEXT,

  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS sbs_project_idx ON public.subcontractor_settlements (project_id);
CREATE INDEX IF NOT EXISTS sbs_wo_idx ON public.subcontractor_settlements (project_id, work_order_ref);
CREATE INDEX IF NOT EXISTS sbs_status_idx ON public.subcontractor_settlements (project_id, settlement_status);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.sbs_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS sbs_updated_at_trg ON public.subcontractor_settlements;
CREATE TRIGGER sbs_updated_at_trg
  BEFORE UPDATE ON public.subcontractor_settlements
  FOR EACH ROW EXECUTE FUNCTION public.sbs_set_updated_at();

-- RLS
ALTER TABLE public.subcontractor_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sbs_select_policy" ON public.subcontractor_settlements;
CREATE POLICY "sbs_select_policy" ON public.subcontractor_settlements FOR SELECT USING (true);
DROP POLICY IF EXISTS "sbs_insert_policy" ON public.subcontractor_settlements;
CREATE POLICY "sbs_insert_policy" ON public.subcontractor_settlements FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "sbs_update_policy" ON public.subcontractor_settlements;
CREATE POLICY "sbs_update_policy" ON public.subcontractor_settlements FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 3. TABLE: subcontractor_wage_clearances
--    Statutory compliance under Inter-State Migrant Workmen Act & BOCW Act
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcontractor_wage_clearances (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  settlement_id                   TEXT        NOT NULL REFERENCES public.subcontractor_settlements(id) ON DELETE CASCADE,
  project_id                      TEXT        NOT NULL,
  work_order_ref                  TEXT        NOT NULL,
  subcontractor_name              TEXT        NOT NULL,

  -- Labour Deployment & Migrant Provisions
  total_workers_deployed          INT         NOT NULL DEFAULT 0,
  migrant_workers_count           INT         NOT NULL DEFAULT 0,
  migrant_worker_passbook_issued  BOOLEAN     NOT NULL DEFAULT FALSE, -- Sec 12 of ISMW Act 1979
  displacement_allowance_cleared  BOOLEAN     NOT NULL DEFAULT FALSE, -- Sec 14 of ISMW Act 1979
  journey_allowance_disbursed     BOOLEAN     NOT NULL DEFAULT FALSE, -- Sec 15 of ISMW Act 1979

  -- Wage & Statutory Fund Disbursal
  final_wages_paid_full           BOOLEAN     NOT NULL DEFAULT FALSE, -- Zero wage arrears
  epf_ecr_cleared                 BOOLEAN     NOT NULL DEFAULT FALSE, -- EPF Electronic Challan Receipt
  epf_challan_ref                 TEXT,
  esic_contribution_cleared       BOOLEAN     NOT NULL DEFAULT FALSE, -- ESIC online monthly contribution
  esic_challan_ref                TEXT,
  bocw_cess_compliant             BOOLEAN     NOT NULL DEFAULT TRUE,  -- 1% BOCW Cess compliance

  -- Labour Welfare Officer Verification
  labour_officer_verified         BOOLEAN     NOT NULL DEFAULT FALSE,
  labour_officer_name             TEXT,
  labour_officer_verified_at      TIMESTAMPTZ,
  clearance_status                public.wage_clearance_status NOT NULL DEFAULT 'PENDING',

  wage_sheet_doc_url              TEXT,
  remarks                         TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS swc_settlement_idx ON public.subcontractor_wage_clearances (settlement_id);
CREATE INDEX IF NOT EXISTS swc_project_idx ON public.subcontractor_wage_clearances (project_id);
CREATE INDEX IF NOT EXISTS swc_status_idx ON public.subcontractor_wage_clearances (clearance_status);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.swc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS swc_updated_at_trg ON public.subcontractor_wage_clearances;
CREATE TRIGGER swc_updated_at_trg
  BEFORE UPDATE ON public.subcontractor_wage_clearances
  FOR EACH ROW EXECUTE FUNCTION public.swc_set_updated_at();

-- RLS
ALTER TABLE public.subcontractor_wage_clearances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "swc_select_policy" ON public.subcontractor_wage_clearances;
CREATE POLICY "swc_select_policy" ON public.subcontractor_wage_clearances FOR SELECT USING (true);
DROP POLICY IF EXISTS "swc_insert_policy" ON public.subcontractor_wage_clearances;
CREATE POLICY "swc_insert_policy" ON public.subcontractor_wage_clearances FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "swc_update_policy" ON public.subcontractor_wage_clearances;
CREATE POLICY "swc_update_policy" ON public.subcontractor_wage_clearances FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 4. TABLE: subcontractor_no_claims_undertakings
--    Legal undertaking indemnifying Principal Employer & waiving future claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcontractor_no_claims_undertakings (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  settlement_id                   TEXT        NOT NULL REFERENCES public.subcontractor_settlements(id) ON DELETE CASCADE,
  project_id                      TEXT        NOT NULL,
  undertaking_ref                 TEXT        NOT NULL UNIQUE,
  authorized_signatory_name       TEXT        NOT NULL,
  authorized_signatory_designation TEXT       NOT NULL,

  -- Indemnity & Waiver Clauses
  indemnity_bond_executed         BOOLEAN     NOT NULL DEFAULT FALSE, -- Indemnity against third-party/labour claims
  all_dues_accepted               BOOLEAN     NOT NULL DEFAULT FALSE, -- Certified full & final settlement accepted
  arbitration_waiver_signed       BOOLEAN     NOT NULL DEFAULT FALSE, -- Waiver of commercial claims under contract
  executed_date                   DATE,
  witness_1_name                  TEXT,
  witness_2_name                  TEXT,
  stamp_paper_value_inr           NUMERIC(10,2) NOT NULL DEFAULT 100.00,

  undertaking_status              public.undertaking_status NOT NULL DEFAULT 'DRAFT',
  doc_hash                        TEXT,       -- Cryptographic SHA-256 seal
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS sncu_settlement_idx ON public.subcontractor_no_claims_undertakings (settlement_id);
CREATE INDEX IF NOT EXISTS sncu_project_idx ON public.subcontractor_no_claims_undertakings (project_id);

-- RLS
ALTER TABLE public.subcontractor_no_claims_undertakings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sncu_select_policy" ON public.subcontractor_no_claims_undertakings;
CREATE POLICY "sncu_select_policy" ON public.subcontractor_no_claims_undertakings FOR SELECT USING (true);
DROP POLICY IF EXISTS "sncu_insert_policy" ON public.subcontractor_no_claims_undertakings;
CREATE POLICY "sncu_insert_policy" ON public.subcontractor_no_claims_undertakings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "sncu_update_policy" ON public.subcontractor_no_claims_undertakings;
CREATE POLICY "sncu_update_policy" ON public.subcontractor_no_claims_undertakings FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subcontractor_settlements'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subcontractor_settlements;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subcontractor_wage_clearances'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subcontractor_wage_clearances;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subcontractor_no_claims_undertakings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subcontractor_no_claims_undertakings;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. SEED DATA (Lucknow Projects)
-- ---------------------------------------------------------------------------
INSERT INTO public.subcontractor_settlements (
  id, project_id, work_order_ref, trade_package, subcontractor_name,
  subcontractor_pan, subcontractor_gstin,
  contract_wo_value_inr, measured_final_qty_value_inr, approved_variations_inr,
  gross_final_claim_inr,
  previous_ra_disbursed_inr, material_advances_recovered_inr, tool_plant_rentals_inr,
  contra_backcharges_inr, site_utility_accommodation_inr, retention_held_inr,
  statutory_tax_withheld_inr, total_deductions_inr, net_payable_balance_inr,
  settlement_status,
  site_supervisor_signed, site_supervisor_name, site_supervisor_signed_at, site_supervisor_remarks,
  commercial_head_signed, commercial_head_name, commercial_head_signed_at, commercial_head_remarks,
  clearance_voucher_number, settlement_date, notes
) VALUES
(
  'sbs-001',
  'PRJ-LKO-TOWER-A',
  'WO-LKO-STR-014',
  'RCC Structural Works & Rebar Framing',
  'Apex Structural Infra Ltd.',
  'AAACA1122B',
  '09AAACA1122B1Z4',
  42500000.00,
  44200000.00,
  1850000.00,
  46050000.00,
  38200000.00,
  1800000.00,
  650000.00,
  320000.00,
  280000.00,
  2302500.00,
  921000.00,
  44473500.00,
  1576500.00,
  'APPROVED_FOR_PAYMENT',
  TRUE,
  'Er. Rajesh Verma (Resident Engineer)',
  NOW() - INTERVAL '4 days',
  'Final measurement book MB-044 verified on site. Steel scrap and shuttering recovered fully.',
  TRUE,
  'Alok Srivastava (Commercial Head)',
  NOW() - INTERVAL '2 days',
  'No pending debit notes. Indemnity bond and ISMW Act passbooks certified by Labour Officer.',
  'VCHR/LKO/STR-014/FNL',
  CURRENT_DATE - 2,
  'Ready for RTGS remittance upon execution of final bank release order.'
),
(
  'sbs-002',
  'PRJ-LKO-TOWER-A',
  'WO-LKO-MEP-022',
  'HVAC, Firefighting & Electrical Containment',
  'ThermoTech MEP Solutions Pvt Ltd',
  'BBBCB3344C',
  '09BBBCB3344C1Z8',
  28000000.00,
  28600000.00,
  750000.00,
  29350000.00,
  24800000.00,
  1100000.00,
  380000.00,
  190000.00,
  165000.00,
  1467500.00,
  587000.00,
  28689500.00,
  660500.00,
  'COMMERCIAL_REVIEW',
  TRUE,
  'Er. Rajesh Verma (Resident Engineer)',
  NOW() - INTERVAL '1 day',
  'Chiller piping testing completed. 2 pressure gauges replaced by contractor.',
  FALSE,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_DATE,
  'Awaiting final reconciliation of site power generator fuel debit vouchers.'
),
(
  'sbs-003',
  'PRJ-LKO-TOWER-A',
  'WO-LKO-FIN-031',
  'Internal Plaster, Gypsum & Tile Finishes',
  'Awadh Finishing Craft LLP',
  'CCCCD5566D',
  '09CCCCD5566D1Z2',
  16500000.00,
  16200000.00,
  320000.00,
  16520000.00,
  13800000.00,
  650000.00,
  210000.00,
  450000.00,
  180000.00,
  826000.00,
  330400.00,
  16446400.00,
  73600.00,
  'LABOUR_CLEARANCE_PENDING',
  FALSE,
  NULL,
  NULL,
  NULL,
  FALSE,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_DATE,
  'Pending wage payment receipt for 14 migrant tile masons from Bihar.'
),
(
  'sbs-004',
  'PRJ-1BHK-GOMTI',
  'WO-GMT-CIV-008',
  'Precast Foundation & Superstructure',
  'Gomti Precast Infra Works',
  'DDDDE7788E',
  '09DDDDE7788E1Z6',
  34000000.00,
  34800000.00,
  1200000.00,
  36000000.00,
  30100000.00,
  1500000.00,
  480000.00,
  210000.00,
  240000.00,
  1800000.00,
  720000.00,
  35050000.00,
  950000.00,
  'SETTLED_DISCHARGED',
  TRUE,
  'Er. Amit Saxena (Project Engineer)',
  NOW() - INTERVAL '15 days',
  'Site handover completed. All precast joints verified by structural audit.',
  TRUE,
  'Alok Srivastava (Commercial Head)',
  NOW() - INTERVAL '12 days',
  'Full and final settlement cleared. No-claims indemnity bond deposited.',
  'VCHR/GMT/CIV-008/DISCH',
  CURRENT_DATE - 12,
  'Archived in CDE compliance repository. DLP security BG active.'
)
ON CONFLICT (id) DO UPDATE SET
  settlement_status = EXCLUDED.settlement_status,
  net_payable_balance_inr = EXCLUDED.net_payable_balance_inr,
  updated_at = NOW();

-- Seed Wage Clearances
INSERT INTO public.subcontractor_wage_clearances (
  id, settlement_id, project_id, work_order_ref, subcontractor_name,
  total_workers_deployed, migrant_workers_count,
  migrant_worker_passbook_issued, displacement_allowance_cleared, journey_allowance_disbursed,
  final_wages_paid_full, epf_ecr_cleared, epf_challan_ref,
  esic_contribution_cleared, esic_challan_ref, bocw_cess_compliant,
  labour_officer_verified, labour_officer_name, labour_officer_verified_at,
  clearance_status, wage_sheet_doc_url, remarks
) VALUES
(
  'swc-001',
  'sbs-001',
  'PRJ-LKO-TOWER-A',
  'WO-LKO-STR-014',
  'Apex Structural Infra Ltd.',
  148,
  82,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  'EPF/2026/08/UP-LKO-44812',
  TRUE,
  'ESIC/2026/08/0900041289',
  TRUE,
  TRUE,
  'Dr. Sanjeev Tripathi (District Labour Enforcement Officer)',
  NOW() - INTERVAL '3 days',
  'VERIFIED_CLEARED',
  '/compliance/labour/apex-wages-aug2026.pdf',
  'All 82 migrant workers from Bihar & West Bengal received displacement allowance and return journey passes.'
),
(
  'swc-002',
  'sbs-002',
  'PRJ-LKO-TOWER-A',
  'WO-LKO-MEP-022',
  'ThermoTech MEP Solutions Pvt Ltd',
  54,
  26,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  'EPF/2026/08/DL-CPM-88910',
  TRUE,
  'ESIC/2026/08/0700019283',
  TRUE,
  TRUE,
  'Er. Rajesh Verma (Resident Engineer)',
  NOW() - INTERVAL '1 day',
  'VERIFIED_CLEARED',
  '/compliance/labour/thermotech-wages-final.pdf',
  'Muster roll bank disbursement records verified against EPF/ESIC portal extracts.'
),
(
  'swc-003',
  'sbs-003',
  'PRJ-LKO-TOWER-A',
  'WO-LKO-FIN-031',
  'Awadh Finishing Craft LLP',
  38,
  24,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  'EPF/2026/07/UP-LKO-11209',
  FALSE,
  NULL,
  TRUE,
  FALSE,
  NULL,
  NULL,
  'PENDING',
  '/compliance/labour/awadh-draft-wages.pdf',
  'Action Required: Contractor must provide passbooks under ISMW Act and deposit ESIC contributions before payment release.'
),
(
  'swc-004',
  'sbs-004',
  'PRJ-1BHK-GOMTI',
  'WO-GMT-CIV-008',
  'Gomti Precast Infra Works',
  92,
  45,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  'EPF/2026/07/UP-LKO-66512',
  TRUE,
  'ESIC/2026/07/0900088192',
  TRUE,
  TRUE,
  'Dr. Sanjeev Tripathi (District Labour Enforcement Officer)',
  NOW() - INTERVAL '14 days',
  'VERIFIED_CLEARED',
  '/compliance/labour/gomti-precast-final-clearance.pdf',
  'Complete statutory clearance issued. No pending labour grievances.'
)
ON CONFLICT (id) DO UPDATE SET
  clearance_status = EXCLUDED.clearance_status,
  labour_officer_verified = EXCLUDED.labour_officer_verified,
  updated_at = NOW();

-- Seed No-Claims Undertakings
INSERT INTO public.subcontractor_no_claims_undertakings (
  id, settlement_id, project_id, undertaking_ref,
  authorized_signatory_name, authorized_signatory_designation,
  indemnity_bond_executed, all_dues_accepted, arbitration_waiver_signed,
  executed_date, witness_1_name, witness_2_name,
  stamp_paper_value_inr, undertaking_status, doc_hash
) VALUES
(
  'sncu-001',
  'sbs-001',
  'PRJ-LKO-TOWER-A',
  'NOC/LKO/STR-014/2026',
  'Vikramaditya Singhal',
  'Managing Director, Apex Structural',
  TRUE,
  TRUE,
  TRUE,
  CURRENT_DATE - 3,
  'S. K. Mehrotra (Advocate, High Court)',
  'Pradeep Pandey (Chief Accountant)',
  500.00,
  'LEGAL_VERIFIED',
  'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
),
(
  'sncu-002',
  'sbs-002',
  'PRJ-LKO-TOWER-A',
  'NOC/LKO/MEP-022/2026',
  'Neeraj Khurana',
  'Director Commercial, ThermoTech',
  TRUE,
  TRUE,
  TRUE,
  CURRENT_DATE - 1,
  'Rohit Anand (Company Secretary)',
  'Deepak Joshi (Site Accounts)',
  500.00,
  'SUBMITTED',
  'sha256-4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'
),
(
  'sncu-003',
  'sbs-003',
  'PRJ-LKO-TOWER-A',
  'NOC/LKO/FIN-031/2026',
  'Mohd. Tariq Ansari',
  'Partner, Awadh Finishing',
  FALSE,
  FALSE,
  FALSE,
  NULL,
  NULL,
  NULL,
  100.00,
  'DRAFT',
  NULL
),
(
  'sncu-004',
  'sbs-004',
  'PRJ-1BHK-GOMTI',
  'NOC/GMT/CIV-008/2026',
  'Kailash Chandra Gupta',
  'Proprietor, Gomti Precast',
  TRUE,
  TRUE,
  TRUE,
  CURRENT_DATE - 14,
  'V. N. Shukla (Notary Public)',
  'Mahesh Yadav (Field Foreman)',
  500.00,
  'LEGAL_VERIFIED',
  'sha256-ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d'
)
ON CONFLICT (id) DO UPDATE SET
  undertaking_status = EXCLUDED.undertaking_status,
  indemnity_bond_executed = EXCLUDED.indemnity_bond_executed;
