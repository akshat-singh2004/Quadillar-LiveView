-- =============================================================================
-- Migration: 20260917_closeout_audit_statutory_vault
-- Module   : Project Closeout Audit Trail & Statutory Compliance Vault
-- Ref      : CPWD Works Manual Section 32 & 45 (Record Retention & Archiving)
--            BOCW Act 1996 Section 39 (Statutory Records & Registers)
--            Contract Labour (Regulation and Abolition) Act, 1970
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.audit_action_category AS ENUM (
    'FINANCIAL_SIGNOFF',
    'CONTRACT_VARIATION',
    'STATUTORY_CLEARANCE',
    'ASSET_HANDOVER',
    'ESCROW_TRANCHE',
    'SECURITY_ACCESS',
    'DEFECT_DEBIT',
    'SYSTEM_CONFIG'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_severity_level AS ENUM (
    'INFO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_certificate_type AS ENUM (
    'LABOUR_LICENSE_BOCW',
    'EPF_ESI_CLEARANCE',
    'GST_TAX_CLEARANCE',
    'FIRE_SAFETY_NOC',
    'STRUCTURAL_STABILITY_CERT',
    'POLLUTION_CONSENT_CTO',
    'LIFT_INSPECTION_LICENSE',
    'ELECTRICAL_INSPECTORATE_NOC'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_validity_status AS ENUM (
    'VALID_CURRENT',
    'EXPIRING_SOON',
    'EXPIRED',
    'PERMANENT_CLEARANCE',
    'REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: project_audit_logs
--    Immutable audit trail stream capturing platform events with SHA-256 seal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_audit_logs (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  timestamp                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id                     TEXT        NOT NULL,
  user_name                   TEXT        NOT NULL,
  user_role                   TEXT        NOT NULL,
  action_category             public.audit_action_category NOT NULL,
  affected_module             TEXT        NOT NULL,
  record_reference            TEXT        NOT NULL,
  action_description          TEXT        NOT NULL,
  ip_address                  TEXT        NOT NULL DEFAULT '192.168.1.1',
  device_signature            TEXT        NOT NULL,
  hash_sha256                 TEXT        NOT NULL,
  previous_state_hash         TEXT,
  severity_level              public.audit_severity_level NOT NULL DEFAULT 'INFO',
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. TABLE: statutory_vault_files
--    Centralized compliance certificate repository
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_vault_files (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  compliance_category         public.compliance_certificate_type NOT NULL,
  document_title              TEXT        NOT NULL,
  issuing_authority           TEXT        NOT NULL,
  certificate_number          TEXT        NOT NULL,
  issue_date                  DATE        NOT NULL,
  expiry_date                 DATE,
  storage_bucket_path         TEXT        NOT NULL,
  file_size_bytes             BIGINT      NOT NULL DEFAULT 0,
  file_hash_sha256            TEXT        NOT NULL,
  validity_status             public.compliance_validity_status NOT NULL DEFAULT 'VALID_CURRENT',
  verified_by                 TEXT        NOT NULL,
  verification_date           DATE        NOT NULL,
  tags                        TEXT[]      DEFAULT '{}',
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. TABLE: compliance_dossier_packages
--    Bundled regulatory closeout packages compiled into verified archives
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_dossier_packages (
  id                          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                  TEXT        NOT NULL,
  package_ref                 TEXT        NOT NULL UNIQUE,
  package_name                TEXT        NOT NULL,
  package_type                TEXT        NOT NULL,
  total_documents_count       INTEGER     NOT NULL DEFAULT 0,
  package_size_bytes          BIGINT      NOT NULL DEFAULT 0,
  sha256_bundle_hash          TEXT        NOT NULL,
  compiled_by                 TEXT        NOT NULL,
  compilation_timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  download_archive_url        TEXT        NOT NULL,
  status                      TEXT        NOT NULL DEFAULT 'SEALED_VERIFIED',
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_log_project ON public.project_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.project_audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.project_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.project_audit_logs(severity_level);
CREATE INDEX IF NOT EXISTS idx_vault_project ON public.statutory_vault_files(project_id);
CREATE INDEX IF NOT EXISTS idx_vault_category ON public.statutory_vault_files(compliance_category);
CREATE INDEX IF NOT EXISTS idx_vault_validity ON public.statutory_vault_files(validity_status);
CREATE INDEX IF NOT EXISTS idx_dossier_project ON public.compliance_dossier_packages(project_id);

-- ---------------------------------------------------------------------------
-- 6. TRIGGERS: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_statutory_vault_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_statutory_vault_updated_at ON public.statutory_vault_files;
CREATE TRIGGER trg_statutory_vault_updated_at
BEFORE UPDATE ON public.statutory_vault_files
FOR EACH ROW EXECUTE FUNCTION update_statutory_vault_updated_at();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_dossier_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow read project_audit_logs" ON public.project_audit_logs;
  CREATE POLICY "Allow read project_audit_logs" ON public.project_audit_logs FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write project_audit_logs" ON public.project_audit_logs;
  CREATE POLICY "Allow write project_audit_logs" ON public.project_audit_logs FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read statutory_vault_files" ON public.statutory_vault_files;
  CREATE POLICY "Allow read statutory_vault_files" ON public.statutory_vault_files FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write statutory_vault_files" ON public.statutory_vault_files;
  CREATE POLICY "Allow write statutory_vault_files" ON public.statutory_vault_files FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read compliance_dossier_packages" ON public.compliance_dossier_packages;
  CREATE POLICY "Allow read compliance_dossier_packages" ON public.compliance_dossier_packages FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write compliance_dossier_packages" ON public.compliance_dossier_packages;
  CREATE POLICY "Allow write compliance_dossier_packages" ON public.compliance_dossier_packages FOR ALL USING (true);
END $$;

-- ---------------------------------------------------------------------------
-- 8. REALTIME REPLICATION
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_audit_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.statutory_vault_files;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_dossier_packages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 9. SEED DATA
-- ---------------------------------------------------------------------------

-- Audit Logs for PRJ-LKO-TOWER-A
INSERT INTO public.project_audit_logs (
  id, project_id, timestamp, user_id, user_name, user_role,
  action_category, affected_module, record_reference, action_description,
  ip_address, device_signature, hash_sha256, previous_state_hash, severity_level
) VALUES
(
  'audit-log-lko-001',
  'PRJ-LKO-TOWER-A',
  '2026-03-31T10:14:22Z',
  'USR-DIR-001',
  'Er. Rajesh Srivastava',
  'Project Director',
  'FINANCIAL_SIGNOFF',
  'Client Financial Closeout',
  'NODUES/2026/4921',
  'Executed final settlement sign-off and issued No-Dues Certificate for Phase 4 completion.',
  '10.14.88.102',
  'Quadillar Workstation Pro (Windows 11 / Chrome 128)',
  '8f94d1b823e843c089c1de29a732289c094bf415fce18683510e428e211475bc',
  '142ae09bb23145ff72d00129bc81102947162817290192837482910293847291',
  'CRITICAL'
),
(
  'audit-log-lko-002',
  'PRJ-LKO-TOWER-A',
  '2026-03-31T09:45:10Z',
  'USR-PMC-004',
  'Dr. K. N. Verma',
  'PMC Project Lead',
  'ESCROW_TRANCHE',
  'Escrow & Warranty Reserve',
  'VCHR/REL/TR1-001',
  'Authorized Tranche 1 (50%) retention release of ₹71,25,000 upon 96.5% snag clearance verification.',
  '10.14.88.115',
  'MacBook Pro M3 Max (macOS 15.1 / Safari 18)',
  '3a29b01cf83182b8192837462819283746192837461928374619283746192837',
  'a891029384716253491827364519283746192837461928374619283746192837',
  'HIGH'
),
(
  'audit-log-lko-003',
  'PRJ-LKO-TOWER-A',
  '2026-03-30T16:20:05Z',
  'USR-QS-002',
  'Vikas Bansal, FCA',
  'Quantity Surveyor (QS)',
  'STATUTORY_CLEARANCE',
  'Subcontractor Final Settlement',
  'WO/LKO/STR-014',
  'Verified Inter-State Migrant Workmen Act Section 12, 14, 15 statutory passbooks & journey allowances for Apex Structural.',
  '192.168.1.45',
  'ThinkPad P16s (Windows 11 / Edge 126)',
  'c948192837461928374619283746192837461928374619283746192837461928',
  'f719283746192837461928374619283746192837461928374619283746192837',
  'MEDIUM'
),
(
  'audit-log-lko-004',
  'PRJ-LKO-TOWER-A',
  '2026-03-29T11:10:40Z',
  'USR-DIR-001',
  'Er. Rajesh Srivastava',
  'Project Director',
  'DEFECT_DEBIT',
  'Escrow & Warranty Reserve',
  'CLM/LKO/ESC-001',
  'Debited ₹5,00,000 from HydroSeal escrow reserve for emergency B2 expansion joint PU grouting default under CPWD Cl. 17.',
  '10.14.88.102',
  'Quadillar Workstation Pro (Windows 11 / Chrome 128)',
  'b819283746192837461928374619283746192837461928374619283746192837',
  'd419283746192837461928374619283746192837461928374619283746192837',
  'HIGH'
),
(
  'audit-log-lko-005',
  'PRJ-LKO-TOWER-A',
  '2026-03-28T14:30:15Z',
  'USR-SEOR-003',
  'Er. Mahendra Pratap',
  'Structural Auditor',
  'ASSET_HANDOVER',
  'As-Built & O&M Vault',
  'DWG/LKO/STR-AB-001',
  'Stamped final consultant approval on Structural As-Built Drawing R3 post-load deflection testing.',
  '10.14.88.204',
  'Dell Precision 5820 (Windows 11 / Chrome 128)',
  'e219283746192837461928374619283746192837461928374619283746192837',
  '1928374619283746192837461928374619283746192837461928374619283746',
  'MEDIUM'
)
ON CONFLICT (id) DO NOTHING;

-- Audit Logs for PRJ-1BHK-GOMTI
INSERT INTO public.project_audit_logs (
  id, project_id, timestamp, user_id, user_name, user_role,
  action_category, affected_module, record_reference, action_description,
  ip_address, device_signature, hash_sha256, previous_state_hash, severity_level
) VALUES
(
  'audit-log-gomti-001',
  'PRJ-1BHK-GOMTI',
  '2026-03-05T14:45:00Z',
  'USR-RE-007',
  'Er. Vikas Bansal',
  'Resident Engineer',
  'DEFECT_DEBIT',
  'Escrow & Warranty Reserve',
  'CLM/GMT/ESC-001',
  'Authorized emergency CPWD Cl. 17 debit of ₹3,20,000 from Awadh ElectroMech for terrace booster pump motor replacement.',
  '192.168.2.14',
  'iPad Pro 12.9 (iPadOS 18.2 / Safari)',
  '4918273645192837461928374619283746192837461928374619283746192837',
  '8192837461928374619283746192837461928374619283746192837461928374',
  'HIGH'
),
(
  'audit-log-gomti-002',
  'PRJ-1BHK-GOMTI',
  '2026-02-15T11:00:00Z',
  'USR-RE-007',
  'Er. Vikas Bansal',
  'Resident Engineer',
  'STATUTORY_CLEARANCE',
  'Statutory Clearance Tracker',
  'BOCW/LKO/GMT-01',
  'Reconciled 1% BOCW Cess deduction totaling ₹12,80,000 against treasury deposit receipt.',
  '192.168.2.14',
  'iPad Pro 12.9 (iPadOS 18.2 / Safari)',
  '9182736451928374619283746192837461928374619283746192837461928374',
  '7182930495817263548192039485716253481920394857162534819203948571',
  'INFO'
)
ON CONFLICT (id) DO NOTHING;

-- Statutory Vault Files for PRJ-LKO-TOWER-A
INSERT INTO public.statutory_vault_files (
  id, project_id, compliance_category, document_title, issuing_authority,
  certificate_number, issue_date, expiry_date, storage_bucket_path,
  file_size_bytes, file_hash_sha256, validity_status, verified_by, verification_date,
  tags, notes
) VALUES
(
  'vault-lko-001',
  'PRJ-LKO-TOWER-A',
  'FIRE_SAFETY_NOC',
  'Final Fire Safety No-Objection Certificate (Height > 45m)',
  'Director General, Fire Service Headquarters, Lucknow, UP',
  'UPFS/LKO/NOC/2025/11928',
  '2025-09-15',
  '2028-09-14',
  'gs://quadillar-vault/compliance/PRJ-LKO-TOWER-A/final_fire_noc.pdf',
  4820192,
  '5a19283746192837461928374619283746192837461928374619283746192837',
  'VALID_CURRENT',
  'Dr. K. N. Verma (PMC Lead)',
  '2025-09-20',
  ARRAY['Fire NOC', 'DG Fire', 'High-Rise Clearance', 'Life Safety'],
  'Full wet-riser, automatic sprinkler grid, and 2-hour fire-rated damper compliance certified.'
),
(
  'vault-lko-002',
  'PRJ-LKO-TOWER-A',
  'STRUCTURAL_STABILITY_CERT',
  'Permanent Structural Stability & Seismic Zone III Certificate',
  'Indian Institute of Technology (IIT) Kanpur & SEOR Board',
  'IITK/CED/STR/2025/449',
  '2025-10-01',
  NULL, -- Permanent life of structure
  'gs://quadillar-vault/compliance/PRJ-LKO-TOWER-A/structural_stability_iitk.pdf',
  8912400,
  '9b19283746192837461928374619283746192837461928374619283746192837',
  'PERMANENT_CLEARANCE',
  'Er. Rajesh Srivastava (Project Director)',
  '2025-10-05',
  ARRAY['Structural Stability', 'IIT Kanpur', 'Seismic III', 'Permanent'],
  'NDT rebound hammer and ultrasonic pulse velocity test validated across 100% columns and shear walls.'
),
(
  'vault-lko-003',
  'PRJ-LKO-TOWER-A',
  'LABOUR_LICENSE_BOCW',
  'Principal Employer Registration & Labour License (Form VI)',
  'Deputy Labour Commissioner, Lucknow Division',
  'DLC/LKO/BOCW/REG/2023/882',
  '2023-04-10',
  '2026-10-31',
  'gs://quadillar-vault/compliance/PRJ-LKO-TOWER-A/labour_license_bocw.pdf',
  2314500,
  '2c19283746192837461928374619283746192837461928374619283746192837',
  'VALID_CURRENT',
  'Vikas Bansal, FCA',
  '2025-11-01',
  ARRAY['BOCW', 'Labour License', 'Form VI', 'Welfare Cess'],
  'Authorized deployment capacity 850 workmen. 1% BOCW Cess fully deposited.'
),
(
  'vault-lko-004',
  'PRJ-LKO-TOWER-A',
  'POLLUTION_CONSENT_CTO',
  'Consent to Operate (CTO) under Air & Water Pollution Acts',
  'Uttar Pradesh Pollution Control Board (UPPCB), Gomti Nagar',
  'UPPCB/CTO/AIR-WATER/2025/309',
  '2025-08-20',
  '2027-08-19',
  'gs://quadillar-vault/compliance/PRJ-LKO-TOWER-A/uppcb_cto_clearance.pdf',
  3420800,
  '7d19283746192837461928374619283746192837461928374619283746192837',
  'VALID_CURRENT',
  'Dr. K. N. Verma (PMC Lead)',
  '2025-08-25',
  ARRAY['UPPCB', 'CTO', 'Environmental Clearance', 'STP Effluent'],
  'Zero liquid discharge STP plant capacity 350 KLD inspected and certified.'
),
(
  'vault-lko-005',
  'PRJ-LKO-TOWER-A',
  'ELECTRICAL_INSPECTORATE_NOC',
  'Chief Electrical Inspector to UP Govt Clearance (11 kV Substation)',
  'Directorate of Electrical Safety, UP Govt, Lucknow',
  'DES/UP/SUB-11KV/2025/711',
  '2025-09-10',
  '2028-09-09',
  'gs://quadillar-vault/compliance/PRJ-LKO-TOWER-A/electrical_safety_11kv.pdf',
  3180400,
  '1e19283746192837461928374619283746192837461928374619283746192837',
  'VALID_CURRENT',
  'Er. Rajesh Srivastava (Project Director)',
  '2025-09-12',
  ARRAY['11kV Substation', 'Electrical Safety', 'Transformers', 'HT Clearance'],
  'Two 1500 kVA dry-type transformers, VCB panels, and earth pit resistance (<0.8 ohm) certified.'
),
(
  'vault-lko-006',
  'PRJ-LKO-TOWER-A',
  'LIFT_INSPECTION_LICENSE',
  'Passenger & Service Elevator Operation Licenses (Otis Lifts)',
  'Inspector of Lifts & Escalators, UP Govt',
  'LIFT/LKO/OTIS/2025/440-444',
  '2025-09-28',
  '2026-09-27',
  'gs://quadillar-vault/compliance/PRJ-LKO-TOWER-A/lift_licenses_otis.pdf',
  2840000,
  '6f19283746192837461928374619283746192837461928374619283746192837',
  'EXPIRING_SOON',
  'Er. Rajesh Srivastava (Project Director)',
  '2025-10-01',
  ARRAY['Otis Lifts', 'Lift License', 'Expiring Soon', 'Annual AMC'],
  '5 passenger elevators licensed. Annual re-inspection required within 60 days.'
)
ON CONFLICT (id) DO NOTHING;

-- Statutory Vault Files for PRJ-1BHK-GOMTI
INSERT INTO public.statutory_vault_files (
  id, project_id, compliance_category, document_title, issuing_authority,
  certificate_number, issue_date, expiry_date, storage_bucket_path,
  file_size_bytes, file_hash_sha256, validity_status, verified_by, verification_date,
  tags, notes
) VALUES
(
  'vault-gomti-001',
  'PRJ-1BHK-GOMTI',
  'STRUCTURAL_STABILITY_CERT',
  'Precast Concrete Superstructure Stability Certification',
  'Civil Engineering Dept, KNIT Sultanpur',
  'KNIT/CED/PREC/2026/088',
  '2026-01-20',
  NULL,
  'gs://quadillar-vault/compliance/PRJ-1BHK-GOMTI/precast_stability.pdf',
  5140200,
  '8a19283746192837461928374619283746192837461928374619283746192837',
  'PERMANENT_CLEARANCE',
  'Er. Vikas Bansal (Resident Engineer)',
  '2026-01-25',
  ARRAY['Precast Structural', 'KNIT Sultanpur', 'Affordable Housing', 'Permanent'],
  'Precast joint shear resistance and load tests verified compliant with IS 15916.'
),
(
  'vault-gomti-002',
  'PRJ-1BHK-GOMTI',
  'GST_TAX_CLEARANCE',
  'Commercial Tax Clearance Certificate (GST TDS Reconciled)',
  'State Tax Department, Sector-14, Lucknow',
  'UPGST/TDS/CLR/2026/902',
  '2026-02-10',
  '2027-03-31',
  'gs://quadillar-vault/compliance/PRJ-1BHK-GOMTI/gst_clearance_cert.pdf',
  1850100,
  '4d19283746192837461928374619283746192837461928374619283746192837',
  'VALID_CURRENT',
  'Vikas Bansal, FCA',
  '2026-02-15',
  ARRAY['GST', 'Tax Clearance', 'TDS 2%', 'State Tax'],
  'Zero statutory tax liability pending across all running account disbursements.'
)
ON CONFLICT (id) DO NOTHING;

-- Compliance Dossier Packages
INSERT INTO public.compliance_dossier_packages (
  id, project_id, package_ref, package_name, package_type,
  total_documents_count, package_size_bytes, sha256_bundle_hash,
  compiled_by, compilation_timestamp, download_archive_url, status, notes
) VALUES
(
  'pkg-lko-001',
  'PRJ-LKO-TOWER-A',
  'CDP/LKO/2026-PKG-01',
  'Full Statutory Closeout & Municipal Occupancy Compliance Dossier',
  'COMPREHENSIVE_STATUTORY_CLOSEOUT',
  14,
  48200000,
  'b948192837461928374619283746192837461928374619283746192837461928',
  'Dr. K. N. Verma (PMC Lead)',
  '2026-03-31T11:00:00Z',
  '/archive/bundles/lko_tower_a_statutory_dossier_v1.tar.gz',
  'SEALED_VERIFIED',
  'Complete statutory package submitted to Lucknow Development Authority (LDA) for Occupancy Certificate (OC).'
),
(
  'pkg-lko-002',
  'PRJ-LKO-TOWER-A',
  'CDP/LKO/2026-PKG-02',
  'BOCW Labour Welfare, EPF & Wage Settlement Audit Dossier',
  'LABOUR_BOCW_CLEARANCE',
  8,
  24100000,
  'f819283746192837461928374619283746192837461928374619283746192837',
  'Vikas Bansal, FCA',
  '2026-03-30T17:00:00Z',
  '/archive/bundles/lko_tower_a_labour_clearance_dossier.tar.gz',
  'SEALED_VERIFIED',
  'Audit-cleared wage register and migrant worker clearance certificates under ISMW Act 1979.'
)
ON CONFLICT (id) DO NOTHING;
