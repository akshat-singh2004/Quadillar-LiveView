-- =============================================================================
-- Migration: 20260917_as_built_vault_om_registry
-- Module   : As-Built Drawing Repository & Digital O&M Manual Vault
-- Ref      : CPWD Works Manual Section 32 (Completion Documentation)
--            FIDIC Red Book Clause 10.1 (Taking-Over of the Works and Sections)
--            ISO 19650-2 Common Data Environment (CDE) As-Built Handover
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.as_built_discipline AS ENUM (
    'STRUCTURAL',
    'ARCHITECTURAL',
    'MEP',
    'HVAC',
    'FIRE_SAFETY',
    'INFRASTRUCTURE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.drawing_approval_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REVISED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.warranty_status AS ENUM (
    'ACTIVE',
    'EXPIRING_SOON',
    'EXPIRED',
    'CLAIM_IN_PROGRESS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.handover_compliance_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'HANDED_OVER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: as_built_drawings
--    As-built CAD, BIM, and PDF drawing records with consultant approval chain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.as_built_drawings (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  drawing_number                  TEXT        NOT NULL,
  sheet_title                     TEXT        NOT NULL,
  discipline                      public.as_built_discipline NOT NULL,
  revision_number                 TEXT        NOT NULL DEFAULT 'R0',
  cde_container                   TEXT        NOT NULL DEFAULT 'CDE/As-Built',
  iso_19650_state                 TEXT        NOT NULL DEFAULT 'Published',

  -- Document Formats & URLs
  cad_dwg_url                     TEXT,
  bim_model_url                   TEXT,
  pdf_drawing_url                 TEXT,
  file_size_bytes                 BIGINT      DEFAULT 0,
  sha256_hash                     TEXT,

  -- Consultant Review Chain
  consultant_approval_status      public.drawing_approval_status NOT NULL DEFAULT 'SUBMITTED',
  consultant_name                 TEXT,
  consultant_approved_at          TIMESTAMPTZ,
  consultant_remarks              TEXT,

  -- Client FM Acceptance
  client_fm_accepted              BOOLEAN     NOT NULL DEFAULT FALSE,
  client_fm_accepted_at           TIMESTAMPTZ,
  client_fm_name                  TEXT,

  tags                            TEXT[]      DEFAULT '{}'::TEXT[],

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS abd_project_idx ON public.as_built_drawings (project_id);
CREATE INDEX IF NOT EXISTS abd_discipline_idx ON public.as_built_drawings (project_id, discipline);
CREATE INDEX IF NOT EXISTS abd_status_idx ON public.as_built_drawings (project_id, consultant_approval_status);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.abd_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS abd_updated_at_trg ON public.as_built_drawings;
CREATE TRIGGER abd_updated_at_trg
  BEFORE UPDATE ON public.as_built_drawings
  FOR EACH ROW EXECUTE FUNCTION public.abd_set_updated_at();

-- RLS
ALTER TABLE public.as_built_drawings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "abd_select_policy" ON public.as_built_drawings;
CREATE POLICY "abd_select_policy" ON public.as_built_drawings FOR SELECT USING (true);
DROP POLICY IF EXISTS "abd_insert_policy" ON public.as_built_drawings;
CREATE POLICY "abd_insert_policy" ON public.as_built_drawings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "abd_update_policy" ON public.as_built_drawings;
CREATE POLICY "abd_update_policy" ON public.as_built_drawings FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 3. TABLE: om_manual_registry
--    Digital O&M manuals, manufacturer warranties, and servicing intervals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.om_manual_registry (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  equipment_tag                   TEXT        NOT NULL,
  equipment_name                  TEXT        NOT NULL,
  discipline                      public.as_built_discipline NOT NULL,
  asset_category                  TEXT        NOT NULL,
  manufacturer                    TEXT        NOT NULL,
  make_model                      TEXT        NOT NULL,
  serial_number                   TEXT,
  installation_location           TEXT        NOT NULL,

  -- Warranty Timeline
  commissioning_date              DATE,
  warranty_start_date             DATE        NOT NULL,
  warranty_expiration_date        DATE        NOT NULL,
  warranty_period_months          INT         NOT NULL DEFAULT 12,
  warranty_status                 public.warranty_status NOT NULL DEFAULT 'ACTIVE',
  warranty_provider_contact       TEXT,
  sla_response_time_hours         INT         DEFAULT 24,

  -- Documentation Repositories
  operation_guide_url             TEXT,
  maintenance_manual_url          TEXT,
  parts_catalog_url               TEXT,
  warranty_certificate_url        TEXT,

  -- Preventative Maintenance Scheduling
  maintenance_interval_months     INT         DEFAULT 3,
  next_scheduled_service_date     DATE,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS om_project_idx ON public.om_manual_registry (project_id);
CREATE INDEX IF NOT EXISTS om_tag_idx ON public.om_manual_registry (project_id, equipment_tag);
CREATE INDEX IF NOT EXISTS om_warranty_idx ON public.om_manual_registry (warranty_expiration_date, warranty_status);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.om_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS om_updated_at_trg ON public.om_manual_registry;
CREATE TRIGGER om_updated_at_trg
  BEFORE UPDATE ON public.om_manual_registry
  FOR EACH ROW EXECUTE FUNCTION public.om_set_updated_at();

-- RLS
ALTER TABLE public.om_manual_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "om_select_policy" ON public.om_manual_registry;
CREATE POLICY "om_select_policy" ON public.om_manual_registry FOR SELECT USING (true);
DROP POLICY IF EXISTS "om_insert_policy" ON public.om_manual_registry;
CREATE POLICY "om_insert_policy" ON public.om_manual_registry FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "om_update_policy" ON public.om_manual_registry;
CREATE POLICY "om_update_policy" ON public.om_manual_registry FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 4. TABLE: digital_handover_checklists
--    Verification matrix for statutory completion & facility handover
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_handover_checklists (
  id                              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id                      TEXT        NOT NULL,
  item_code                       TEXT        NOT NULL UNIQUE,
  discipline                      public.as_built_discipline NOT NULL,
  deliverable_category            TEXT        NOT NULL,
  deliverable_title               TEXT        NOT NULL,
  cpwd_clause_ref                 TEXT,
  status                          public.handover_compliance_status NOT NULL DEFAULT 'PENDING',
  attached_doc_url                TEXT,

  verified_by_pmc                 BOOLEAN     NOT NULL DEFAULT FALSE,
  pmc_engineer_name               TEXT,
  client_fm_signed                BOOLEAN     NOT NULL DEFAULT FALSE,
  client_fm_name                  TEXT,
  sign_off_date                   DATE,
  remarks                         TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS dhc_project_idx ON public.digital_handover_checklists (project_id);
CREATE INDEX IF NOT EXISTS dhc_status_idx ON public.digital_handover_checklists (project_id, status);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.dhc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS dhc_updated_at_trg ON public.digital_handover_checklists;
CREATE TRIGGER dhc_updated_at_trg
  BEFORE UPDATE ON public.digital_handover_checklists
  FOR EACH ROW EXECUTE FUNCTION public.dhc_set_updated_at();

-- RLS
ALTER TABLE public.digital_handover_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dhc_select_policy" ON public.digital_handover_checklists;
CREATE POLICY "dhc_select_policy" ON public.digital_handover_checklists FOR SELECT USING (true);
DROP POLICY IF EXISTS "dhc_insert_policy" ON public.digital_handover_checklists;
CREATE POLICY "dhc_insert_policy" ON public.digital_handover_checklists FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "dhc_update_policy" ON public.digital_handover_checklists;
CREATE POLICY "dhc_update_policy" ON public.digital_handover_checklists FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'as_built_drawings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.as_built_drawings;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'om_manual_registry'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.om_manual_registry;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'digital_handover_checklists'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_handover_checklists;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. SEED DATA (Lucknow Projects)
-- ---------------------------------------------------------------------------
INSERT INTO public.as_built_drawings (
  id, project_id, drawing_number, sheet_title, discipline, revision_number,
  cde_container, iso_19650_state, cad_dwg_url, bim_model_url, pdf_drawing_url,
  file_size_bytes, sha256_hash, consultant_approval_status,
  consultant_name, consultant_approved_at, consultant_remarks,
  client_fm_accepted, client_fm_accepted_at, client_fm_name, tags
) VALUES
(
  'abd-001',
  'PRJ-LKO-TOWER-A',
  'AB-STR-LKO-001',
  'Foundation Raft & Basement 2 Rebar Reinforcement As-Built',
  'STRUCTURAL',
  'R3',
  'CDE/As-Built/Structural',
  'Published',
  '/vault/drawings/AB-STR-LKO-001.dwg',
  '/vault/bim/LKO-TOWER-STR-ASBUILT.ifc',
  '/vault/pdf/AB-STR-LKO-001.pdf',
  24850000,
  'sha256-a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
  'APPROVED',
  'M/s Tata Consulting Engineers (Structural Auditor)',
  NOW() - INTERVAL '10 days',
  'All field variations in shear wall boundary elements incorporated as per site NDT verification.',
  TRUE,
  NOW() - INTERVAL '7 days',
  'Er. Mahendra Pratap (Client FM Lead)',
  ARRAY['Foundation', 'Raft', 'Substructure', 'NDT Verified']
),
(
  'abd-002',
  'PRJ-LKO-TOWER-A',
  'AB-ARC-LKO-104',
  'Typical Floor (L03-L18) Architectural Layout & Fire Refuge As-Built',
  'ARCHITECTURAL',
  'R2',
  'CDE/As-Built/Architectural',
  'Published',
  '/vault/drawings/AB-ARC-LKO-104.dwg',
  '/vault/bim/LKO-TOWER-ARC-ASBUILT.ifc',
  '/vault/pdf/AB-ARC-LKO-104.pdf',
  18340000,
  'sha256-b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
  'APPROVED',
  'Design Studio Architects (Principal Architect)',
  NOW() - INTERVAL '8 days',
  'Fire door ratings and refuge terrace clearances comply with UP Fire Services NOC.',
  TRUE,
  NOW() - INTERVAL '5 days',
  'Er. Mahendra Pratap (Client FM Lead)',
  ARRAY['Architectural', 'Refuge Terrace', 'Fire Egress']
),
(
  'abd-003',
  'PRJ-LKO-TOWER-A',
  'AB-HVAC-LKO-201',
  'Central Chiller Plant Room & Primary Condenser Circuit Layout',
  'HVAC',
  'R2',
  'CDE/As-Built/HVAC',
  'Published',
  '/vault/drawings/AB-HVAC-LKO-201.dwg',
  '/vault/bim/LKO-TOWER-MEP-ASBUILT.ifc',
  '/vault/pdf/AB-HVAC-LKO-201.pdf',
  31200000,
  'sha256-c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012',
  'APPROVED',
  'Climatic Engineering Consultants (MEP PMC)',
  NOW() - INTERVAL '4 days',
  'Chiller pipe routing reconciled with hydraulic pressure balance test certificates.',
  FALSE,
  NULL,
  NULL,
  ARRAY['HVAC', 'Chillers', 'Plant Room', 'AHU']
),
(
  'abd-004',
  'PRJ-LKO-TOWER-A',
  'AB-FIR-LKO-301',
  'Fire Hydrant, Wet Riser & Sprinkler Schematic Dossier',
  'FIRE_SAFETY',
  'R1',
  'CDE/As-Built/Fire',
  'Published',
  '/vault/drawings/AB-FIR-LKO-301.dwg',
  '/vault/bim/LKO-TOWER-FIRE-ASBUILT.ifc',
  '/vault/pdf/AB-FIR-LKO-301.pdf',
  14500000,
  'sha256-d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123',
  'APPROVED',
  'Bureau of Fire Protection Systems (Specialist Consultant)',
  NOW() - INTERVAL '6 days',
  'Complies with NBC Part 4 and UP State Fire Service clearance.',
  TRUE,
  NOW() - INTERVAL '3 days',
  'Er. Mahendra Pratap (Client FM Lead)',
  ARRAY['Fire Safety', 'Sprinklers', 'Wet Riser', 'NBC-Part4']
),
(
  'abd-005',
  'PRJ-1BHK-GOMTI',
  'AB-INF-GMT-001',
  'Stormwater Drainage, Rainwater Harvesting & Sewerage Network',
  'INFRASTRUCTURE',
  'R1',
  'CDE/As-Built/Infrastructure',
  'Published',
  '/vault/drawings/AB-INF-GMT-001.dwg',
  NULL,
  '/vault/pdf/AB-INF-GMT-001.pdf',
  9800000,
  'sha256-e5f67890123456789abcdef0123456789abcdef0123456789abcdef01234',
  'APPROVED',
  'Municipal Engineering Consultants',
  NOW() - INTERVAL '15 days',
  'Gomti Nagar Municipal Corporation connection levels surveyed and certified.',
  TRUE,
  NOW() - INTERVAL '12 days',
  'K. K. Dixit (Gomti Complex Facility Head)',
  ARRAY['Infrastructure', 'Stormwater', 'Sewage', 'RWH']
)
ON CONFLICT (id) DO UPDATE SET
  consultant_approval_status = EXCLUDED.consultant_approval_status,
  client_fm_accepted = EXCLUDED.client_fm_accepted,
  updated_at = NOW();

-- Seed O&M Manuals
INSERT INTO public.om_manual_registry (
  id, project_id, equipment_tag, equipment_name, discipline, asset_category,
  manufacturer, make_model, serial_number, installation_location,
  commissioning_date, warranty_start_date, warranty_expiration_date,
  warranty_period_months, warranty_status, warranty_provider_contact,
  sla_response_time_hours, operation_guide_url, maintenance_manual_url,
  parts_catalog_url, warranty_certificate_url, maintenance_interval_months,
  next_scheduled_service_date
) VALUES
(
  'omm-001',
  'PRJ-LKO-TOWER-A',
  'HVAC-CHL-01',
  'Water-Cooled Centrifugal Chiller 500 TR',
  'HVAC',
  'Central Chiller Plant',
  'Daikin Airconditioning India Pvt Ltd',
  'Daikin Magnitude WME-500',
  'DKN-2026-CHL-0891',
  'Basement 2 · Central Plant Room B2-04',
  '2026-08-15',
  '2026-08-15',
  '2028-08-15',
  24,
  'ACTIVE',
  '+91-1800-100-4455 (Daikin Enterprise Support)',
  4,
  '/vault/om/daikin-wme500-userguide.pdf',
  '/vault/om/daikin-wme500-maintenance.pdf',
  '/vault/om/daikin-parts-catalog.pdf',
  '/vault/certs/daikin-warranty-cert.pdf',
  3,
  CURRENT_DATE + INTERVAL '45 days'
),
(
  'omm-002',
  'PRJ-LKO-TOWER-A',
  'ELE-DG-01',
  '1500 kVA Synchronized Diesel Generator Set',
  'MEP',
  'Emergency Power Backup',
  'Cummins India Ltd',
  'Cummins QSK50-G4',
  'CUM-2026-DG-4412',
  'Ground Floor · External Acoustic DG Yard',
  '2026-07-20',
  '2026-07-20',
  '2027-07-20',
  12,
  'EXPIRING_SOON',
  '+91-1800-210-2525 (Cummins Care India)',
  2,
  '/vault/om/cummins-qsk50-manual.pdf',
  '/vault/om/cummins-maintenance-schedule.pdf',
  '/vault/om/cummins-parts-list.pdf',
  '/vault/certs/cummins-warranty.pdf',
  1,
  CURRENT_DATE + INTERVAL '12 days'
),
(
  'omm-003',
  'PRJ-LKO-TOWER-A',
  'FIR-PMP-01',
  'Multi-Stage Centrifugal Main Fire Hydrant Pump',
  'FIRE_SAFETY',
  'Fire Suppression System',
  'Kirloskar Brothers Limited',
  'Kirloskar DB 150/40',
  'KBL-2026-PMP-9921',
  'Basement 2 · Fire Pump Room B2-01',
  '2026-08-01',
  '2026-08-01',
  '2028-08-01',
  24,
  'ACTIVE',
  '+91-1800-10-3444 (Kirloskar Corporate Care)',
  6,
  '/vault/om/kirloskar-firepump-manual.pdf',
  '/vault/om/kirloskar-sop.pdf',
  '/vault/om/kirloskar-spares.pdf',
  '/vault/certs/kirloskar-warranty.pdf',
  3,
  CURRENT_DATE + INTERVAL '60 days'
),
(
  'omm-004',
  'PRJ-LKO-TOWER-A',
  'ELE-LFT-01',
  'High-Speed Passenger Elevator (2.5 m/s, 24 Passenger)',
  'MEP',
  'Vertical Transportation',
  'Schindler India Pvt Ltd',
  'Schindler 5500',
  'SCH-2026-LFT-3012',
  'Passenger Shaft Core P1',
  '2026-09-01',
  '2026-09-01',
  '2027-09-01',
  12,
  'ACTIVE',
  '+91-1800-22-6688 (Schindler 24x7 Hotline)',
  1,
  '/vault/om/schindler-5500-guide.pdf',
  '/vault/om/schindler-servicing.pdf',
  '/vault/om/schindler-safety-protocols.pdf',
  '/vault/certs/schindler-warranty.pdf',
  1,
  CURRENT_DATE + INTERVAL '20 days'
),
(
  'omm-005',
  'PRJ-1BHK-GOMTI',
  'STP-MBBR-01',
  '100 KLD Sewage Treatment Plant (MBBR Technology)',
  'INFRASTRUCTURE',
  'Sanitary Environmental Treatment',
  'Thermax Limited',
  'Thermax BioCask MBBR-100',
  'TMX-2026-STP-1102',
  'Rear Service Utility Compound',
  '2026-06-10',
  '2026-06-10',
  '2026-12-10',
  6,
  'EXPIRING_SOON',
  '+91-1800-209-0115 (Thermax Water Support)',
  12,
  '/vault/om/thermax-stp-manual.pdf',
  '/vault/om/thermax-chemical-dosing.pdf',
  '/vault/om/thermax-biological-sop.pdf',
  '/vault/certs/thermax-warranty.pdf',
  1,
  CURRENT_DATE + INTERVAL '18 days'
)
ON CONFLICT (id) DO UPDATE SET
  warranty_status = EXCLUDED.warranty_status,
  updated_at = NOW();

-- Seed Handover Checklists
INSERT INTO public.digital_handover_checklists (
  id, project_id, item_code, discipline, deliverable_category,
  deliverable_title, cpwd_clause_ref, status, attached_doc_url,
  verified_by_pmc, pmc_engineer_name, client_fm_signed, client_fm_name,
  sign_off_date, remarks
) VALUES
(
  'dhc-001',
  'PRJ-LKO-TOWER-A',
  'HDO-STR-01',
  'STRUCTURAL',
  'Statutory As-Built Drawing',
  'Foundation & Superstructure Structural As-Built CAD & BIM Model Package',
  'CPWD Works Manual Section 32.2',
  'HANDED_OVER',
  '/vault/drawings/AB-STR-LKO-001.dwg',
  TRUE,
  'Er. Rajesh Tiwari (Resident Engineer, Quadillar)',
  TRUE,
  'Er. Mahendra Pratap (Client FM Lead)',
  CURRENT_DATE - 7,
  'Digital IFC model and signed CAD drawings officially deposited in client facility archive.'
),
(
  'dhc-002',
  'PRJ-LKO-TOWER-A',
  'HDO-ARC-02',
  'ARCHITECTURAL',
  'Statutory As-Built Drawing',
  'Complete Architectural Floor Plans, Elevations & Fire Refuge Layouts',
  'CPWD Works Manual Section 32.3',
  'HANDED_OVER',
  '/vault/drawings/AB-ARC-LKO-104.pdf',
  TRUE,
  'Er. Rajesh Tiwari (Resident Engineer, Quadillar)',
  TRUE,
  'Er. Mahendra Pratap (Client FM Lead)',
  CURRENT_DATE - 5,
  'As-built square footage matches sanctioned municipal building permit.'
),
(
  'dhc-003',
  'PRJ-LKO-TOWER-A',
  'HDO-HVAC-03',
  'HVAC',
  'O&M Manual',
  'Central Chiller Plant O&M Guide & 2-Year Manufacturer Warranty Bond',
  'FIDIC Red Book Clause 10.1',
  'VERIFIED',
  '/vault/om/daikin-wme500-userguide.pdf',
  TRUE,
  'Er. Rajesh Tiwari (Resident Engineer, Quadillar)',
  FALSE,
  NULL,
  NULL,
  'Pending final acoustic test report verification by Client FM MEP engineer.'
),
(
  'dhc-004',
  'PRJ-LKO-TOWER-A',
  'HDO-FIR-04',
  'FIRE_SAFETY',
  'Statutory NOC',
  'Final Fire Safety NOC from State Fire Directorate & Hydrant Flow Certificates',
  'NBC Part 4 / CPWD Cl. 32.5',
  'HANDED_OVER',
  '/vault/certs/fire-noc-final-2026.pdf',
  TRUE,
  'Er. Rajesh Tiwari (Resident Engineer, Quadillar)',
  TRUE,
  'Er. Mahendra Pratap (Client FM Lead)',
  CURRENT_DATE - 3,
  'Permanent fire safety NOC received with 100% flow pressure clearance.'
),
(
  'dhc-005',
  'PRJ-LKO-TOWER-A',
  'HDO-ELE-05',
  'MEP',
  'Statutory NOC',
  'Chief Electrical Inspector to Government (CEIG) Substation Energization Clearance',
  'Indian Electricity Rules / CPWD 32.6',
  'PENDING',
  NULL,
  FALSE,
  NULL,
  FALSE,
  NULL,
  NULL,
  'Awaiting final inspection token from UP Power Transmission Corporation Ltd.'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  client_fm_signed = EXCLUDED.client_fm_signed,
  updated_at = NOW();
