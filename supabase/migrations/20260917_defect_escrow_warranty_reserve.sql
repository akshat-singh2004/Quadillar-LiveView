-- =============================================================================
-- Migration: 20260917_defect_escrow_warranty_reserve
-- Module   : Defect Liability Escrow & Warranty Reserve Account
-- Ref      : CPWD GCC Clause 17 (Defects Liability Period: 12-24 Months)
--            CPWD GCC Clause 14 (Remedy of Defective Work through 3rd Party)
--            FIDIC Red Book Clause 11 (Defects Notification Period)
--            FIDIC Red Book Clause 14.9 (Payment of Retention Money)
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.escrow_account_status AS ENUM (
    'ACTIVE',
    'FROZEN',
    'CLOSED',
    'RECONCILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.warranty_trade_package AS ENUM (
    'CIVIL_STRUCTURAL',
    'MEP_HVAC',
    'WATERPROOFING_INSULATION',
    'ELEVATORS_ESCALATORS',
    'FIRE_PROTECTION_SAFETY',
    'FACADE_FENESTRATION',
    'ELECTRICAL_SUBSTATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.warranty_reserve_status AS ENUM (
    'RESERVED',
    'PARTIALLY_RELEASED',
    'FULLY_RELEASED',
    'ARBITRATION_HOLD',
    'FORFEITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.escrow_claim_status AS ENUM (
    'LOGGED',
    'PM_VERIFIED',
    'NOTICE_EXPIRED',
    'EXECUTED_DEBITED',
    'REJECTED',
    'DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.escrow_transaction_type AS ENUM (
    'DEPOSIT_RETENTION',
    'TRANCHE_1_RELEASE',
    'TRANCHE_2_RELEASE',
    'THIRD_PARTY_DEBIT',
    'INTEREST_CREDIT',
    'BANK_CHARGES'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: defect_escrow_accounts
--    Master escrow account holding retained security for defect liability
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.defect_escrow_accounts (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  escrow_account_number       TEXT        NOT NULL UNIQUE,
  escrow_bank_name            TEXT        NOT NULL,
  escrow_branch               TEXT        NOT NULL,
  ifsc_code                   TEXT        NOT NULL,
  account_holder_name         TEXT        NOT NULL,
  trustee_agent_name          TEXT        NOT NULL,
  trustee_contact_email       TEXT,

  -- Financial Balances (INR)
  total_retained_value_inr    NUMERIC(18,2) NOT NULL DEFAULT 0,
  released_amount_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,
  pending_claims_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_balance_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,
  accrued_interest_inr        NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate_pct           NUMERIC(5,2)  NOT NULL DEFAULT 6.50,
  account_status              public.escrow_account_status NOT NULL DEFAULT 'ACTIVE',

  -- DLP Milestones & Tranches
  dlp_start_date              DATE        NOT NULL,
  dlp_end_date                DATE        NOT NULL,
  dlp_duration_months         INTEGER     NOT NULL DEFAULT 12,
  tranche_1_pct               NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  tranche_1_released          BOOLEAN     NOT NULL DEFAULT FALSE,
  tranche_1_release_date      DATE,
  tranche_2_pct               NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  tranche_2_released          BOOLEAN     NOT NULL DEFAULT FALSE,
  tranche_2_release_date      DATE,
  snag_clearance_pct          NUMERIC(5,2) NOT NULL DEFAULT 0.00,

  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. TABLE: warranty_reserve_allocations
--    Reserve allocations by trade package / subcontractor for warranty
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warranty_reserve_allocations (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  escrow_account_id           TEXT        NOT NULL REFERENCES public.defect_escrow_accounts(id) ON DELETE CASCADE,
  project_id                  TEXT        NOT NULL,
  trade_package               public.warranty_trade_package NOT NULL,
  contractor_name             TEXT        NOT NULL,
  work_order_ref              TEXT        NOT NULL,
  allocated_reserve_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  claimed_amount_inr          NUMERIC(18,2) NOT NULL DEFAULT 0,
  released_amount_inr         NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_balance_inr       NUMERIC(18,2) NOT NULL DEFAULT 0,
  warranty_period_months      INTEGER     NOT NULL DEFAULT 12,
  warranty_end_date           DATE        NOT NULL,
  punchlist_cleared           BOOLEAN     NOT NULL DEFAULT FALSE,
  clearance_percentage        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  status                      public.warranty_reserve_status NOT NULL DEFAULT 'RESERVED',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. TABLE: escrow_defect_claims
--    Emergency defect rectification claims & 3rd-party debits under CPWD Cl. 17 & 14
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escrow_defect_claims (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  escrow_account_id           TEXT        NOT NULL REFERENCES public.defect_escrow_accounts(id) ON DELETE CASCADE,
  project_id                  TEXT        NOT NULL,
  claim_number                TEXT        NOT NULL UNIQUE,
  original_contractor         TEXT        NOT NULL,
  trade_package               public.warranty_trade_package NOT NULL,
  defect_description          TEXT        NOT NULL,
  location_tag                TEXT        NOT NULL,
  incident_date               DATE        NOT NULL,
  rectification_notice_ref    TEXT        NOT NULL,
  notice_served_date          DATE        NOT NULL,
  notice_period_days          INTEGER     NOT NULL DEFAULT 14,
  contractor_response         TEXT,
  rectification_cost_inr      NUMERIC(18,2) NOT NULL DEFAULT 0,
  third_party_contractor      TEXT        NOT NULL,
  third_party_work_order_ref  TEXT        NOT NULL,
  third_party_invoice_ref     TEXT        NOT NULL,
  claim_status                public.escrow_claim_status NOT NULL DEFAULT 'LOGGED',
  authorized_by               TEXT        NOT NULL,
  debit_date                  DATE,
  evidence_photos_count       INTEGER     DEFAULT 0,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. TABLE: escrow_transaction_ledger
--    Full transaction audit trail: deposits, releases, claims debits, interest
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escrow_transaction_ledger (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  escrow_account_id           TEXT        NOT NULL REFERENCES public.defect_escrow_accounts(id) ON DELETE CASCADE,
  project_id                  TEXT        NOT NULL,
  transaction_ref             TEXT        NOT NULL UNIQUE,
  transaction_date            DATE        NOT NULL,
  transaction_type            public.escrow_transaction_type NOT NULL,
  amount_inr                  NUMERIC(18,2) NOT NULL,
  balance_after_inr           NUMERIC(18,2) NOT NULL,
  beneficiary_or_remitter     TEXT        NOT NULL,
  reference_voucher           TEXT        NOT NULL,
  narration                   TEXT        NOT NULL,
  approved_by                 TEXT        NOT NULL,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_escrow_acc_project ON public.defect_escrow_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_escrow_acc_status ON public.defect_escrow_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_warranty_reserve_acc ON public.warranty_reserve_allocations(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_warranty_reserve_proj ON public.warranty_reserve_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_warranty_reserve_pkg ON public.warranty_reserve_allocations(trade_package);
CREATE INDEX IF NOT EXISTS idx_escrow_claim_acc ON public.escrow_defect_claims(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_claim_status ON public.escrow_defect_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_escrow_claim_proj ON public.escrow_defect_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_escrow_txn_acc ON public.escrow_transaction_ledger(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_txn_date ON public.escrow_transaction_ledger(transaction_date DESC);

-- ---------------------------------------------------------------------------
-- 7. TRIGGERS: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_defect_escrow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defect_escrow_updated_at ON public.defect_escrow_accounts;
CREATE TRIGGER trg_defect_escrow_updated_at
BEFORE UPDATE ON public.defect_escrow_accounts
FOR EACH ROW EXECUTE FUNCTION update_defect_escrow_updated_at();

DROP TRIGGER IF EXISTS trg_warranty_reserve_updated_at ON public.warranty_reserve_allocations;
CREATE TRIGGER trg_warranty_reserve_updated_at
BEFORE UPDATE ON public.warranty_reserve_allocations
FOR EACH ROW EXECUTE FUNCTION update_defect_escrow_updated_at();

DROP TRIGGER IF EXISTS trg_escrow_claims_updated_at ON public.escrow_defect_claims;
CREATE TRIGGER trg_escrow_claims_updated_at
BEFORE UPDATE ON public.escrow_defect_claims
FOR EACH ROW EXECUTE FUNCTION update_defect_escrow_updated_at();

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.defect_escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_reserve_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_defect_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transaction_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow read defect_escrow_accounts" ON public.defect_escrow_accounts;
  CREATE POLICY "Allow read defect_escrow_accounts" ON public.defect_escrow_accounts FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write defect_escrow_accounts" ON public.defect_escrow_accounts;
  CREATE POLICY "Allow write defect_escrow_accounts" ON public.defect_escrow_accounts FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read warranty_reserve_allocations" ON public.warranty_reserve_allocations;
  CREATE POLICY "Allow read warranty_reserve_allocations" ON public.warranty_reserve_allocations FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write warranty_reserve_allocations" ON public.warranty_reserve_allocations;
  CREATE POLICY "Allow write warranty_reserve_allocations" ON public.warranty_reserve_allocations FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read escrow_defect_claims" ON public.escrow_defect_claims;
  CREATE POLICY "Allow read escrow_defect_claims" ON public.escrow_defect_claims FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write escrow_defect_claims" ON public.escrow_defect_claims;
  CREATE POLICY "Allow write escrow_defect_claims" ON public.escrow_defect_claims FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read escrow_transaction_ledger" ON public.escrow_transaction_ledger;
  CREATE POLICY "Allow read escrow_transaction_ledger" ON public.escrow_transaction_ledger FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write escrow_transaction_ledger" ON public.escrow_transaction_ledger;
  CREATE POLICY "Allow write escrow_transaction_ledger" ON public.escrow_transaction_ledger FOR ALL USING (true);
END $$;

-- ---------------------------------------------------------------------------
-- 9. REALTIME REPLICATION
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.defect_escrow_accounts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warranty_reserve_allocations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_defect_claims;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_transaction_ledger;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 10. SEED DATA
-- ---------------------------------------------------------------------------
-- Account 1: PRJ-LKO-TOWER-A (Gomti Nagar Mixed-Use Tower)
INSERT INTO public.defect_escrow_accounts (
  id, project_id, escrow_account_number, escrow_bank_name, escrow_branch, ifsc_code,
  account_holder_name, trustee_agent_name, trustee_contact_email,
  total_retained_value_inr, released_amount_inr, pending_claims_inr, current_balance_inr, accrued_interest_inr, interest_rate_pct,
  account_status, dlp_start_date, dlp_end_date, dlp_duration_months,
  tranche_1_pct, tranche_1_released, tranche_1_release_date,
  tranche_2_pct, tranche_2_released, tranche_2_release_date,
  snag_clearance_pct, notes
) VALUES (
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'ESC-SBI-LKO-8829104',
  'State Bank of India',
  'CAG Branch, Hazratganj, Lucknow',
  'SBIN0000125',
  'Quadillar Infra & UP Avas Vikas Escrow Trust A/C',
  'SBI Cap Trustee Co. Ltd.',
  'trustee.escrow@sbicaptrustee.com',
  14250000.00,
  7125000.00,
  850000.00,
  6575000.00,
  385420.00,
  6.50,
  'ACTIVE',
  '2025-10-15',
  '2026-10-14',
  12,
  50.00,
  TRUE,
  '2025-11-20',
  50.00,
  FALSE,
  NULL,
  96.50,
  'Tripartite Escrow Agreement executed under CPWD GCC Cl. 17 & FIDIC Cl. 14.9. Tranche 1 released post-TOC & 96.5% snag clearance.'
) ON CONFLICT (id) DO UPDATE SET
  total_retained_value_inr = EXCLUDED.total_retained_value_inr,
  released_amount_inr = EXCLUDED.released_amount_inr,
  current_balance_inr = EXCLUDED.current_balance_inr;

-- Account 2: PRJ-1BHK-GOMTI (Affordable Housing Phase II)
INSERT INTO public.defect_escrow_accounts (
  id, project_id, escrow_account_number, escrow_bank_name, escrow_branch, ifsc_code,
  account_holder_name, trustee_agent_name, trustee_contact_email,
  total_retained_value_inr, released_amount_inr, pending_claims_inr, current_balance_inr, accrued_interest_inr, interest_rate_pct,
  account_status, dlp_start_date, dlp_end_date, dlp_duration_months,
  tranche_1_pct, tranche_1_released, tranche_1_release_date,
  tranche_2_pct, tranche_2_released, tranche_2_release_date,
  snag_clearance_pct, notes
) VALUES (
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'ESC-HDFC-GOMTI-441920',
  'HDFC Bank Ltd.',
  'Vibhuti Khand Corporate Branch, Lucknow',
  'HDFC0000542',
  'Quadillar LiveView Gomti Housing Escrow Trust A/C',
  'Beacon Trusteeship Ltd.',
  'escrow.trustee@beacontrustee.co.in',
  6400000.00,
  0.00,
  320000.00,
  6080000.00,
  142800.00,
  6.25,
  'ACTIVE',
  '2026-02-01',
  '2027-01-31',
  12,
  50.00,
  FALSE,
  NULL,
  50.00,
  FALSE,
  NULL,
  82.40,
  'Precast housing block warranty escrow. Snag clearance at 82.4%; Tranche 1 release pending threshold of 95%.'
) ON CONFLICT (id) DO UPDATE SET
  total_retained_value_inr = EXCLUDED.total_retained_value_inr,
  current_balance_inr = EXCLUDED.current_balance_inr;

-- Seed Warranty Reserve Allocations for PRJ-LKO-TOWER-A
INSERT INTO public.warranty_reserve_allocations (
  id, escrow_account_id, project_id, trade_package, contractor_name, work_order_ref,
  allocated_reserve_inr, claimed_amount_inr, released_amount_inr, remaining_balance_inr,
  warranty_period_months, warranty_end_date, punchlist_cleared, clearance_percentage, status
) VALUES
(
  'res-lko-001',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'CIVIL_STRUCTURAL',
  'Apex Structural Infra Ltd.',
  'WO/LKO/STR-014',
  5500000.00,
  0.00,
  2750000.00,
  2750000.00,
  24,
  '2027-10-14',
  TRUE,
  98.00,
  'PARTIALLY_RELEASED'
),
(
  'res-lko-002',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'MEP_HVAC',
  'ThermoTech MEP Solutions Pvt Ltd',
  'WO/LKO/MEP-008',
  3800000.00,
  350000.00,
  1900000.00,
  1550000.00,
  12,
  '2026-10-14',
  TRUE,
  95.00,
  'PARTIALLY_RELEASED'
),
(
  'res-lko-003',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'WATERPROOFING_INSULATION',
  'HydroSeal Specialized Membranes',
  'WO/LKO/WTP-003',
  2450000.00,
  500000.00,
  1225000.00,
  725000.00,
  60,
  '2030-10-14',
  FALSE,
  92.50,
  'PARTIALLY_RELEASED'
),
(
  'res-lko-004',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'ELEVATORS_ESCALATORS',
  'Otis Elevator Company India Ltd',
  'WO/LKO/VTR-002',
  1500000.00,
  0.00,
  750000.00,
  750000.00,
  24,
  '2027-10-14',
  TRUE,
  100.00,
  'PARTIALLY_RELEASED'
),
(
  'res-lko-005',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'FIRE_PROTECTION_SAFETY',
  'SafeGuard Fire Systems India',
  'WO/LKO/FPS-006',
  1000000.00,
  0.00,
  500000.00,
  500000.00,
  12,
  '2026-10-14',
  TRUE,
  97.00,
  'PARTIALLY_RELEASED'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Warranty Reserve Allocations for PRJ-1BHK-GOMTI
INSERT INTO public.warranty_reserve_allocations (
  id, escrow_account_id, project_id, trade_package, contractor_name, work_order_ref,
  allocated_reserve_inr, claimed_amount_inr, released_amount_inr, remaining_balance_inr,
  warranty_period_months, warranty_end_date, punchlist_cleared, clearance_percentage, status
) VALUES
(
  'res-gomti-001',
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'CIVIL_STRUCTURAL',
  'Gomti Precast Infra Tech',
  'WO/GMT/STR-001',
  3600000.00,
  0.00,
  0.00,
  3600000.00,
  12,
  '2027-01-31',
  FALSE,
  84.00,
  'RESERVED'
),
(
  'res-gomti-002',
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'MEP_HVAC',
  'Awadh ElectroMech Engineering',
  'WO/GMT/MEP-004',
  1800000.00,
  320000.00,
  0.00,
  1480000.00,
  12,
  '2027-01-31',
  FALSE,
  80.50,
  'RESERVED'
),
(
  'res-gomti-003',
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'WATERPROOFING_INSULATION',
  'AquaBlock Polychem Pvt Ltd',
  'WO/GMT/WTP-002',
  1000000.00,
  0.00,
  0.00,
  1000000.00,
  60,
  '2031-01-31',
  FALSE,
  83.00,
  'RESERVED'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Escrow Defect Claims (Third-Party Default Debits)
INSERT INTO public.escrow_defect_claims (
  id, escrow_account_id, project_id, claim_number, original_contractor, trade_package,
  defect_description, location_tag, incident_date, rectification_notice_ref, notice_served_date,
  notice_period_days, contractor_response, rectification_cost_inr, third_party_contractor,
  third_party_work_order_ref, third_party_invoice_ref, claim_status, authorized_by, debit_date,
  evidence_photos_count, notes
) VALUES
(
  'claim-lko-001',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'CLM/LKO/ESC-001',
  'HydroSeal Specialized Membranes',
  'WATERPROOFING_INSULATION',
  'Basement-2 expansion joint heavy seepage flooding electrical switchgear chamber during monsoon downpour.',
  'Tower A - B2 Electrical Substation',
  '2025-11-05',
  'NOT/DLP/CPWD-17/042',
  '2025-11-06',
  14,
  'Contractor failed to mobilize rectification crew within statutory 14-day window citing material shortage.',
  500000.00,
  'Apex Leakage Remediation Services LLP',
  'WO/EMG/LKO-001',
  'INV/APX-2025/119',
  'EXECUTED_DEBITED',
  'Dr. K. N. Verma (PMC Director)',
  '2025-11-28',
  8,
  'Emergency PU injection grouting and elastomeric combiflex bandage installed. Debited from HydroSeal retention escrow.'
),
(
  'claim-lko-002',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'CLM/LKO/ESC-002',
  'ThermoTech MEP Solutions Pvt Ltd',
  'MEP_HVAC',
  'Chilled water primary pump #2 bearing failure causing severe vibration and acoustic resonance in commercial lobby.',
  'Tower A - Central Chiller Plant Room',
  '2025-12-10',
  'NOT/DLP/CPWD-17/051',
  '2025-12-11',
  14,
  'Contractor disputed pump alignment defect attributing to external power surge. PMC inspection proved mechanical misalignment.',
  350000.00,
  'Voltas Industrial Engineering Services',
  'WO/EMG/LKO-004',
  'INV/VOL-LKO-992',
  'EXECUTED_DEBITED',
  'Er. Rajesh Srivastava (Project Director)',
  '2026-01-08',
  5,
  'Laser re-alignment, dynamic balancing, and bearing replacement completed by Voltas. Debited from ThermoTech escrow.'
),
(
  'claim-gomti-001',
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'CLM/GMT/ESC-001',
  'Awadh ElectroMech Engineering',
  'MEP_HVAC',
  'Overhead water tank booster pump automated level sensor failure leading to repeated dry runs and burnt motor windings.',
  'Block C - Terrace Pump Room',
  '2026-02-18',
  'NOT/DLP/CPWD-17/007',
  '2026-02-19',
  14,
  'Contractor acknowledged defect but requested 4 weeks due to OEM parts lead time. Emergency replacement required for residents.',
  320000.00,
  'Kirloskar Authorized Service Agency',
  'WO/EMG/GMT-001',
  'INV/KAS-2026-44',
  'EXECUTED_DEBITED',
  'Er. Vikas Bansal (Resident Engineer)',
  '2026-03-05',
  4,
  'Replacement of 7.5 HP motor and digital hydrostatic sensor completed. Debited from Awadh ElectroMech reserve.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Escrow Transaction Ledger
INSERT INTO public.escrow_transaction_ledger (
  id, escrow_account_id, project_id, transaction_ref, transaction_date,
  transaction_type, amount_inr, balance_after_inr, beneficiary_or_remitter,
  reference_voucher, narration, approved_by
) VALUES
(
  'txn-lko-001',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'TXN/SBI/ESC-2025-001',
  '2025-10-15',
  'DEPOSIT_RETENTION',
  14250000.00,
  14250000.00,
  'Quadillar Infra Projects Ltd',
  'VCHR/DEP/LKO-001',
  'Initial 5% contract retention deposit into SBI Escrow Trust A/C upon Practical Completion & TOC issuance.',
  'Er. Rajesh Srivastava'
),
(
  'txn-lko-002',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'TXN/SBI/ESC-2025-002',
  '2025-11-20',
  'TRANCHE_1_RELEASE',
  7125000.00,
  7125000.00,
  'Multiple Subcontractors (Apex, ThermoTech, HydroSeal, Otis, SafeGuard)',
  'VCHR/REL/TR1-001',
  'Tranche 1 (50%) Retention Release post-TOC & Snag Clearance exceeding 95% threshold per FIDIC Cl. 14.9.',
  'Dr. K. N. Verma & Trustee'
),
(
  'txn-lko-003',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'TXN/SBI/ESC-2025-003',
  '2025-11-28',
  'THIRD_PARTY_DEBIT',
  500000.00,
  6625000.00,
  'Apex Leakage Remediation Services LLP',
  'VCHR/DBT/EMG-001',
  'CPWD Cl. 17 emergency debit for B2 basement expansion joint PU injection waterproofing default.',
  'Dr. K. N. Verma (PMC)'
),
(
  'txn-lko-004',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'TXN/SBI/ESC-2026-004',
  '2026-01-08',
  'THIRD_PARTY_DEBIT',
  350000.00,
  6275000.00,
  'Voltas Industrial Engineering Services',
  'VCHR/DBT/EMG-002',
  'CPWD Cl. 17 emergency debit for Primary Chilled Water Pump alignment and bearing failure default.',
  'Er. Rajesh Srivastava'
),
(
  'txn-lko-005',
  'escrow-lko-001',
  'PRJ-LKO-TOWER-A',
  'TXN/SBI/ESC-2026-005',
  '2026-03-31',
  'INTEREST_CREDIT',
  300000.00,
  6575000.00,
  'State Bank of India',
  'INT/CRED/Q4-2026',
  'Quarterly escrow interest accrual credit @ 6.50% p.a. as per Tripartite Escrow Trust Agreement.',
  'SBI Escrow Officer'
),
(
  'txn-gomti-001',
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'TXN/HDFC/ESC-2026-001',
  '2026-02-01',
  'DEPOSIT_RETENTION',
  6400000.00,
  6400000.00,
  'Quadillar LiveView Gomti Special Purpose Entity',
  'VCHR/DEP/GMT-001',
  'Initial 5% contract retention deposit into HDFC Escrow Trust A/C upon structural completion & handover initiation.',
  'Er. Vikas Bansal'
),
(
  'txn-gomti-002',
  'escrow-gomti-002',
  'PRJ-1BHK-GOMTI',
  'TXN/HDFC/ESC-2026-002',
  '2026-03-05',
  'THIRD_PARTY_DEBIT',
  320000.00,
  6080000.00,
  'Kirloskar Authorized Service Agency',
  'VCHR/DBT/GMT-001',
  'CPWD Cl. 17 emergency debit for Block C terrace booster pump motor burnout and replacement.',
  'Er. Vikas Bansal'
)
ON CONFLICT (id) DO NOTHING;
