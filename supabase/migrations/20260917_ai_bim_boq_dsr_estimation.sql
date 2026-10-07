-- =============================================================================
-- Migration: 20260917_ai_bim_boq_dsr_estimation
-- Module   : AI-Powered BIM-to-BOQ & CPWD DSR Automated Estimation Engine
-- Ref      : CPWD Works Manual Chapters V & VI (Estimates & Tenders)
--            CPWD Delhi Schedule of Rates (DSR 2023)
--            CPWD Analysis of Rates (DAR 2023)
--            FIDIC Red Book (1999/2017) Pre-Construction Cost Governance
-- Schema   : public (Supabase / PostgreSQL)
-- Strategy : Fully idempotent — safe to re-run on any environment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS FOR BOQ SUB-HEADS, RATE SOURCES & BIM ELEMENT TYPES
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.boq_subhead_category AS ENUM (
    'SUB_01_EARTHWORK',
    'SUB_02_CONCRETE_WORK',
    'SUB_03_RCC_STRUCTURE',
    'SUB_04_BRICK_MASONRY',
    'SUB_05_STEEL_WORK',
    'SUB_06_FLOORING',
    'SUB_07_ROOFING',
    'SUB_08_FINISHING_PLASTER',
    'SUB_09_ROAD_INFRA',
    'SUB_10_MEP_SERVICES'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rate_source_type AS ENUM (
    'CPWD_DSR_2023',
    'STATE_PWD_SOR',
    'NON_DSR_MARKET_ANALYZED',
    'CUSTOM_ITEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bim_element_type AS ENUM (
    'IFC_FOOTING',
    'IFC_COLUMN',
    'IFC_BEAM',
    'IFC_SLAB',
    'IFC_SHEAR_WALL',
    'IFC_BRICK_WALL',
    'IFC_REBAR',
    'IFC_PLASTER_FINISH',
    'IFC_FLOOR_TILES',
    'IFC_STRUCTURAL_STEEL',
    'IFC_MEP_PIPE',
    'IFC_MEP_DUCT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.boq_item_status AS ENUM (
    'AUTO_EXTRACTED',
    'RATE_MATCHED',
    'ESTIMATOR_VERIFIED',
    'SANCTIONED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: dsr_rate_analysis
--    Decomposed unit rate analysis per CPWD DAR (Delhi Analysis of Rates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dsr_rate_analysis (
  id                          TEXT        PRIMARY KEY DEFAULT ('dsr-ra-' || floor(random() * 1000000)::text),
  dsr_item_code               TEXT        NOT NULL UNIQUE,
  sub_head                    TEXT        NOT NULL,
  description                 TEXT        NOT NULL,
  unit                        TEXT        NOT NULL,
  base_rate_delhi_inr         NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  -- Percentage Cost Weightage
  material_cost_pct           NUMERIC(5,2) NOT NULL DEFAULT 65.00,
  labour_cost_pct             NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  machinery_cost_pct          NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  water_charges_pct           NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  contractor_profit_pct       NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  gst_pct                     NUMERIC(5,2) NOT NULL DEFAULT 18.00,

  -- JSONB Detailed Coefficients
  material_breakdown          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  labour_breakdown            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  machinery_breakdown         JSONB       NOT NULL DEFAULT '[]'::jsonb,

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. TABLE: estimation_cost_indices
--    CPWD Location Cost Indices (Base: Delhi = 100.0)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimation_cost_indices (
  id                          TEXT        PRIMARY KEY DEFAULT ('ci-' || floor(random() * 100000)::text),
  location_name               TEXT        NOT NULL UNIQUE,
  state_code                  TEXT        NOT NULL,
  base_year                   INT         NOT NULL DEFAULT 2023,
  cost_index_pct              NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  cement_sub_index            NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  steel_sub_index             NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  labour_sub_index            NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  effective_date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  gazette_notification_ref   TEXT,
  is_active                   BOOLEAN     NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. TABLE: project_boq_items
--    BIM-extracted and DSR-matched schedule of quantities and cost items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_boq_items (
  id                          TEXT        PRIMARY KEY DEFAULT ('boq-item-' || floor(random() * 1000000)::text),
  project_id                  TEXT        NOT NULL,
  item_code                   TEXT        NOT NULL,
  wbs_code                    TEXT        NOT NULL,
  sub_head_code               public.boq_subhead_category NOT NULL,
  sub_head_title              TEXT        NOT NULL,
  item_description            TEXT        NOT NULL,
  
  -- BIM Element Association
  bim_element_type            public.bim_element_type NOT NULL,
  ifc_guid                    TEXT,
  drawing_sheet_ref           TEXT,

  -- Quantities & Measurement
  unit                        TEXT        NOT NULL,
  bim_measured_quantity       NUMERIC(15,3) NOT NULL DEFAULT 0.000,
  manual_override_quantity    NUMERIC(15,3),
  final_quantity              NUMERIC(15,3) NOT NULL DEFAULT 0.000,

  -- Rates & Valuation
  rate_source                 public.rate_source_type NOT NULL DEFAULT 'CPWD_DSR_2023',
  dsr_base_rate_inr           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  cost_index_factor           NUMERIC(6,4) NOT NULL DEFAULT 1.0000,
  adjusted_unit_rate_inr      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_estimated_cost_inr    NUMERIC(15,2) NOT NULL DEFAULT 0.00,

  -- AI Extraction & Confidence
  confidence_score            NUMERIC(4,3) NOT NULL DEFAULT 0.980,
  matching_algorithm          TEXT        DEFAULT 'BIM_IFC_GEOMETRY_PARSER_V3',
  status                      public.boq_item_status NOT NULL DEFAULT 'RATE_MATCHED',
  
  -- Audit & Signatures
  estimator_notes             TEXT,
  verified_by                 TEXT,
  verified_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_boq_project_id ON public.project_boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_subhead ON public.project_boq_items(project_id, sub_head_code);
CREATE INDEX IF NOT EXISTS idx_boq_item_code ON public.project_boq_items(item_code);
CREATE INDEX IF NOT EXISTS idx_boq_bim_element ON public.project_boq_items(bim_element_type);
CREATE INDEX IF NOT EXISTS idx_boq_status ON public.project_boq_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_dsr_ra_item ON public.dsr_rate_analysis(dsr_item_code);
CREATE INDEX IF NOT EXISTS idx_cost_index_loc ON public.estimation_cost_indices(location_name);

-- ---------------------------------------------------------------------------
-- 6. TRIGGERS: auto-compute final quantity & total cost
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_boq_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Final quantity is manual override if specified, otherwise BIM measured
  IF NEW.manual_override_quantity IS NOT NULL AND NEW.manual_override_quantity >= 0 THEN
    NEW.final_quantity := NEW.manual_override_quantity;
  ELSE
    NEW.final_quantity := NEW.bim_measured_quantity;
  END IF;

  -- Adjusted rate = base rate * cost index factor
  NEW.adjusted_unit_rate_inr := ROUND(NEW.dsr_base_rate_inr * NEW.cost_index_factor, 2);

  -- Total cost = final quantity * adjusted unit rate
  NEW.total_estimated_cost_inr := ROUND(NEW.final_quantity * NEW.adjusted_unit_rate_inr, 2);

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_boq_item_totals ON public.project_boq_items;
CREATE TRIGGER trg_compute_boq_item_totals
BEFORE INSERT OR UPDATE ON public.project_boq_items
FOR EACH ROW EXECUTE FUNCTION public.compute_boq_item_totals();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.dsr_rate_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_cost_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_boq_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow read dsr_rate_analysis" ON public.dsr_rate_analysis;
  CREATE POLICY "Allow read dsr_rate_analysis" ON public.dsr_rate_analysis FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write dsr_rate_analysis" ON public.dsr_rate_analysis;
  CREATE POLICY "Allow write dsr_rate_analysis" ON public.dsr_rate_analysis FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read estimation_cost_indices" ON public.estimation_cost_indices;
  CREATE POLICY "Allow read estimation_cost_indices" ON public.estimation_cost_indices FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write estimation_cost_indices" ON public.estimation_cost_indices;
  CREATE POLICY "Allow write estimation_cost_indices" ON public.estimation_cost_indices FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow read project_boq_items" ON public.project_boq_items;
  CREATE POLICY "Allow read project_boq_items" ON public.project_boq_items FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write project_boq_items" ON public.project_boq_items;
  CREATE POLICY "Allow write project_boq_items" ON public.project_boq_items FOR ALL USING (true);
END $$;

-- ---------------------------------------------------------------------------
-- 8. REALTIME REPLICATION PUBLICATION
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_boq_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 9. SEED DATA: COST INDICES
-- ---------------------------------------------------------------------------
INSERT INTO public.estimation_cost_indices (
  id, location_name, state_code, base_year, cost_index_pct, cement_sub_index, steel_sub_index, labour_sub_index, effective_date, gazette_notification_ref
) VALUES
  ('ci-delhi-base', 'Delhi Base (CPWD DSR Reference)', 'DL', 2023, 100.00, 100.00, 100.00, 100.00, '2023-04-01', 'CPWD/DSR/2023/CIRCULAR-01'),
  ('ci-lko-up', 'Lucknow & Awadh Region', 'UP', 2023, 118.50, 114.20, 122.80, 119.50, '2026-01-01', 'UP-PWD/EST/LKO/2026/04'),
  ('ci-ncr-noida', 'Noida & Greater Noida (NCR)', 'UP', 2023, 114.20, 112.00, 118.50, 113.00, '2026-01-01', 'NOIDA/AUTH/ENG/2026/89'),
  ('ci-varanasi', 'Varanasi Smart City Region', 'UP', 2023, 121.00, 116.50, 125.00, 121.20, '2026-01-01', 'UP-PWD/VNS/CIRCULAR/12'),
  ('ci-prayagraj', 'Prayagraj Sangam Zone', 'UP', 2023, 117.80, 113.80, 120.50, 118.00, '2026-01-01', 'UP-PWD/PRG/RATES/07')
ON CONFLICT (location_name) DO UPDATE
SET cost_index_pct = EXCLUDED.cost_index_pct,
    cement_sub_index = EXCLUDED.cement_sub_index,
    steel_sub_index = EXCLUDED.steel_sub_index,
    labour_sub_index = EXCLUDED.labour_sub_index;

-- ---------------------------------------------------------------------------
-- 10. SEED DATA: DSR RATE ANALYSIS
-- ---------------------------------------------------------------------------
INSERT INTO public.dsr_rate_analysis (
  id, dsr_item_code, sub_head, description, unit, base_rate_delhi_inr,
  material_cost_pct, labour_cost_pct, machinery_cost_pct, water_charges_pct, contractor_profit_pct, gst_pct,
  material_breakdown, labour_breakdown, machinery_breakdown
) VALUES
  (
    'dsr-ra-02.08',
    'DSR-02.08',
    'SUB_01_EARTHWORK',
    'Earth work in excavation by mechanical means in foundation trenches or drains (not exceeding 1.5 m in width or 10 sqm on plan)',
    'cum',
    185.50,
    0.00, 42.50, 42.50, 0.00, 15.00, 18.00,
    '[]'::jsonb,
    '[
      {"trade": "Beldar (Unskilled Labour)", "coefficient": 0.18, "unitRateInr": 680, "amountInr": 122.40},
      {"trade": "Mate / Supervisor", "coefficient": 0.02, "unitRateInr": 780, "amountInr": 15.60}
    ]'::jsonb,
    '[
      {"equipment": "Hydraulic Excavator (0.9 cum bucket)", "coefficient": 0.04, "unitRateInr": 1800, "amountInr": 72.00}
    ]'::jsonb
  ),
  (
    'dsr-ra-04.01',
    'DSR-04.01',
    'SUB_02_CONCRETE_WORK',
    'Providing and laying in position cement concrete 1:4:8 (1 Cement : 4 coarse sand : 8 graded stone aggregate 40mm nominal size) in foundation',
    'cum',
    5680.00,
    72.00, 12.00, 1.00, 1.00, 15.00, 18.00,
    '[
      {"material": "OPC 43 Cement", "coefficient": 3.40, "unit": "bags", "unitRateInr": 380, "amountInr": 1292.00},
      {"material": "Coarse Sand (Zone II)", "coefficient": 0.48, "unit": "cum", "unitRateInr": 1850, "amountInr": 888.00},
      {"material": "40mm Graded Stone Aggregate", "coefficient": 0.95, "unit": "cum", "unitRateInr": 1650, "amountInr": 1567.50}
    ]'::jsonb,
    '[
      {"trade": "Mason (Skilled)", "coefficient": 0.35, "unitRateInr": 920, "amountInr": 322.00},
      {"trade": "Beldar (Labour)", "coefficient": 1.20, "unitRateInr": 680, "amountInr": 816.00},
      {"trade": "Bhisti (Water Boy)", "coefficient": 0.50, "unitRateInr": 720, "amountInr": 360.00}
    ]'::jsonb,
    '[
      {"equipment": "Concrete Mixer (10/7 CFT)", "coefficient": 0.25, "unitRateInr": 450, "amountInr": 112.50}
    ]'::jsonb
  ),
  (
    'dsr-ra-05.09',
    'DSR-05.09.1',
    'SUB_03_RCC_STRUCTURE',
    'Reinforced cement concrete work in beams, suspended floors, roofs and lintels up to floor five level: 1:1.5:3 (1 cement : 1.5 coarse sand : 3 graded stone aggregate 20mm nominal size)',
    'cum',
    8450.00,
    74.50, 9.50, 1.00, 1.00, 15.00, 18.00,
    '[
      {"material": "OPC 53 Cement", "coefficient": 8.00, "unit": "bags", "unitRateInr": 410, "amountInr": 3280.00},
      {"material": "Coarse Sand (Zone II)", "coefficient": 0.42, "unit": "cum", "unitRateInr": 1900, "amountInr": 798.00},
      {"material": "20mm Graded Stone Aggregate", "coefficient": 0.84, "unit": "cum", "unitRateInr": 1850, "amountInr": 1554.00},
      {"material": "Plasticizer / Retarder Admixture", "coefficient": 3.00, "unit": "kg", "unitRateInr": 120, "amountInr": 360.00}
    ]'::jsonb,
    '[
      {"trade": "Mason (1st Class)", "coefficient": 0.50, "unitRateInr": 980, "amountInr": 490.00},
      {"trade": "Beldar (Concrete Crew)", "coefficient": 1.60, "unitRateInr": 680, "amountInr": 1088.00},
      {"trade": "Vibrator Operator", "coefficient": 0.35, "unitRateInr": 850, "amountInr": 297.50},
      {"trade": "Bhisti (Curing Crew)", "coefficient": 0.60, "unitRateInr": 720, "amountInr": 432.00}
    ]'::jsonb,
    '[
      {"equipment": "Needle Vibrator 40mm", "coefficient": 0.40, "unitRateInr": 350, "amountInr": 140.00}
    ]'::jsonb
  ),
  (
    'dsr-ra-05.22',
    'DSR-05.22.6',
    'SUB_03_RCC_STRUCTURE',
    'Steel reinforcement for R.C.C. work including straightening, cutting, bending, placing in position and binding all complete: Thermo-Mechanically Treated bars of grade Fe-500D or more',
    'kg',
    89.40,
    76.00, 8.00, 1.00, 1.00, 15.00, 18.00,
    '[
      {"material": "TMT Steel Fe-500D (Primary Mills - SAIL/TATA/JSW)", "coefficient": 1.05, "unit": "kg", "unitRateInr": 62.50, "amountInr": 65.63},
      {"material": "GI Binding Wire 18 Gauge", "coefficient": 0.015, "unit": "kg", "unitRateInr": 95.00, "amountInr": 1.43}
    ]'::jsonb,
    '[
      {"trade": "Bar Bender (Blacksmith 1st Class)", "coefficient": 0.006, "unitRateInr": 950, "amountInr": 5.70},
      {"trade": "Beldar / Helper", "coefficient": 0.006, "unitRateInr": 680, "amountInr": 4.08}
    ]'::jsonb,
    '[
      {"equipment": "Rebar Cutting & Bending Machine", "coefficient": 0.002, "unitRateInr": 400, "amountInr": 0.80}
    ]'::jsonb
  ),
  (
    'dsr-ra-06.01',
    'DSR-06.01.1',
    'SUB_04_BRICK_MASONRY',
    'Brick work with common burnt clay F.P.S. (non modular) bricks of class designation 7.5 in foundation and plinth in: Cement mortar 1:6 (1 cement : 6 coarse sand)',
    'cum',
    6120.00,
    68.00, 16.00, 0.00, 1.00, 15.00, 18.00,
    '[
      {"material": "Burnt Clay Bricks (Class 7.5)", "coefficient": 494, "unit": "nos", "unitRateInr": 7.20, "amountInr": 3556.80},
      {"material": "OPC Cement", "coefficient": 1.90, "unit": "bags", "unitRateInr": 390, "amountInr": 741.00},
      {"material": "Coarse Sand", "coefficient": 0.28, "unit": "cum", "unitRateInr": 1850, "amountInr": 518.00}
    ]'::jsonb,
    '[
      {"trade": "Mason (Brickwork)", "coefficient": 0.70, "unitRateInr": 950, "amountInr": 665.00},
      {"trade": "Beldar (Labour)", "coefficient": 1.40, "unitRateInr": 680, "amountInr": 952.00},
      {"trade": "Bhisti (Curing)", "coefficient": 0.40, "unitRateInr": 720, "amountInr": 288.00}
    ]'::jsonb,
    '[]'::jsonb
  ),
  (
    'dsr-ra-10.02',
    'DSR-10.02',
    'SUB_05_STEEL_WORK',
    'Structural steel work in single section, fixed without connecting plate including cutting, hoisting, fixing in position and applying a priming coat of approved steel primer all complete',
    'kg',
    115.60,
    78.00, 6.00, 1.00, 1.00, 15.00, 18.00,
    '[
      {"material": "Structural Rolled Sections (ISMB / ISMC / ISNT)", "coefficient": 1.03, "unit": "kg", "unitRateInr": 82.00, "amountInr": 84.46},
      {"material": "Zinc Chromate Red Oxide Primer", "coefficient": 0.02, "unit": "litre", "unitRateInr": 210, "amountInr": 4.20},
      {"material": "Welding Electrodes E6013", "coefficient": 0.01, "unit": "kg", "unitRateInr": 180, "amountInr": 1.80}
    ]'::jsonb,
    '[
      {"trade": "Structural Fabricator / Welder", "coefficient": 0.008, "unitRateInr": 1050, "amountInr": 8.40},
      {"trade": "Rigger / Fitter Helper", "coefficient": 0.008, "unitRateInr": 720, "amountInr": 5.76}
    ]'::jsonb,
    '[
      {"equipment": "Mobile Crane 20T Hoisting", "coefficient": 0.0015, "unitRateInr": 2200, "amountInr": 3.30}
    ]'::jsonb
  ),
  (
    'dsr-ra-13.01',
    'DSR-13.01.2',
    'SUB_08_FINISHING_PLASTER',
    '15 mm cement plaster on rough side of single or half brick wall of mix: 1:6 (1 cement: 6 fine sand)',
    'sqm',
    298.00,
    48.00, 36.00, 0.00, 1.00, 15.00, 18.00,
    '[
      {"material": "OPC Cement", "coefficient": 0.12, "unit": "bags", "unitRateInr": 390, "amountInr": 46.80},
      {"material": "Fine Sand (Zone IV)", "coefficient": 0.022, "unit": "cum", "unitRateInr": 1650, "amountInr": 36.30}
    ]'::jsonb,
    '[
      {"trade": "Plasterer / Mason (1st Class)", "coefficient": 0.09, "unitRateInr": 950, "amountInr": 85.50},
      {"trade": "Beldar (Labour)", "coefficient": 0.12, "unitRateInr": 680, "amountInr": 81.60},
      {"trade": "Bhisti (Curing)", "coefficient": 0.05, "unitRateInr": 720, "amountInr": 36.00}
    ]'::jsonb,
    '[]'::jsonb
  )
ON CONFLICT (dsr_item_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. SEED DATA: PROJECT BOQ ITEMS (PRJ-LKO-TOWER-A)
-- ---------------------------------------------------------------------------
INSERT INTO public.project_boq_items (
  id, project_id, item_code, wbs_code, sub_head_code, sub_head_title, item_description,
  bim_element_type, ifc_guid, drawing_sheet_ref, unit,
  bim_measured_quantity, manual_override_quantity, rate_source, dsr_base_rate_inr, cost_index_factor,
  confidence_score, matching_algorithm, status, estimator_notes, verified_by
) VALUES
  (
    'boq-lko-001',
    'PRJ-LKO-TOWER-A',
    'DSR-02.08',
    'WBS-01.01',
    'SUB_01_EARTHWORK',
    'Subhead 01: Earthwork & Site Grading',
    'Earth work in excavation by mechanical means in foundation trenches or drains (not exceeding 1.5 m in width or 10 sqm on plan) including dressing of sides and ramming of bottoms.',
    'IFC_FOOTING',
    '3G6x$q0Vb9O8aK_01a',
    'DWG-STR-FND-001',
    'cum',
    14500.000,
    NULL,
    'CPWD_DSR_2023',
    185.50,
    1.1850,
    0.985,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'Derived from Navisworks / Revit 2026 foundation pit mass-haul diagram.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-002',
    'PRJ-LKO-TOWER-A',
    'DSR-04.01',
    'WBS-01.02',
    'SUB_02_CONCRETE_WORK',
    'Subhead 02: Concrete Work (PCC)',
    'Providing and laying in position cement concrete 1:4:8 (1 Cement : 4 coarse sand : 8 graded stone aggregate 40mm nominal size) in foundation leveling course.',
    'IFC_FOOTING',
    '2P7y$r1Vc8N7bL_02b',
    'DWG-STR-FND-002',
    'cum',
    1680.000,
    NULL,
    'CPWD_DSR_2023',
    5680.00,
    1.1850,
    0.992,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'PCC 100mm mud mat under raft footing and retaining wall base.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-003',
    'PRJ-LKO-TOWER-A',
    'DSR-05.09.1',
    'WBS-02.01',
    'SUB_03_RCC_STRUCTURE',
    'Subhead 03: Reinforced Cement Concrete (RCC)',
    'Reinforced cement concrete work in columns, retaining walls and shear walls up to floor five level: M25 concrete (1:1.5:3) using RMC and superplasticizer.',
    'IFC_COLUMN',
    '1K8z$s2Wd7M6cM_03c',
    'DWG-STR-COL-101',
    'cum',
    4850.000,
    NULL,
    'CPWD_DSR_2023',
    8450.00,
    1.1850,
    0.989,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'High-durability design mix with silica fume admixture for Lucknow groundwater conditions.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-004',
    'PRJ-LKO-TOWER-A',
    'DSR-05.09.1',
    'WBS-02.02',
    'SUB_03_RCC_STRUCTURE',
    'Subhead 03: Reinforced Cement Concrete (RCC)',
    'Reinforced cement concrete work in suspended slabs, beams, cantilevers and balconies: M25 design mix, mechanically poured and vibrated.',
    'IFC_SLAB',
    '0H9a$t3Xe6L5dN_04d',
    'DWG-STR-SLB-201',
    'cum',
    6200.000,
    NULL,
    'CPWD_DSR_2023',
    8450.00,
    1.1850,
    0.994,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'Solid flat slabs and post-tensioned band beams across floors 1 to 14.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-005',
    'PRJ-LKO-TOWER-A',
    'DSR-05.22.6',
    'WBS-02.03',
    'SUB_03_RCC_STRUCTURE',
    'Subhead 03: Reinforced Cement Concrete (RCC)',
    'Steel reinforcement for R.C.C. work including straightening, cutting, bending, placing in position and binding: Thermo-Mechanically Treated bars Fe-500D (IS 1786).',
    'IFC_REBAR',
    '9F0b$u4Yf5K4eO_05e',
    'DWG-STR-BBS-301',
    'kg',
    1280000.000,
    NULL,
    'CPWD_DSR_2023',
    89.40,
    1.1850,
    0.978,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'BBS schedule verified against 115 kg/cum rebar density parameter.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-006',
    'PRJ-LKO-TOWER-A',
    'DSR-06.01.1',
    'WBS-03.01',
    'SUB_04_BRICK_MASONRY',
    'Subhead 04: Brick Masonry',
    'Brick work with common burnt clay F.P.S. bricks class 7.5 in superstructure in cement mortar 1:6 (1 cement : 6 coarse sand).',
    'IFC_BRICK_WALL',
    '8E1c$v5Zg4J3fP_06f',
    'DWG-ARC-PLN-102',
    'cum',
    3420.000,
    NULL,
    'CPWD_DSR_2023',
    6120.00,
    1.1850,
    0.982,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    '230mm external peripheral acoustic walls and stair core fire separations.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-007',
    'PRJ-LKO-TOWER-A',
    'DSR-10.02',
    'WBS-04.01',
    'SUB_05_STEEL_WORK',
    'Subhead 05: Structural Steel Work',
    'Structural steel work in single section, fixed without connecting plate including cutting, hoisting, fixing in position and applying a priming coat of red oxide zinc chromate.',
    'IFC_STRUCTURAL_STEEL',
    '7D2d$w6Ah3I2gQ_07g',
    'DWG-STR-STL-401',
    'kg',
    215000.000,
    NULL,
    'CPWD_DSR_2023',
    115.60,
    1.1850,
    0.990,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'Rooftop architectural crown truss and atrium space frame girder canopy.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-008',
    'PRJ-LKO-TOWER-A',
    'DSR-13.01.2',
    'WBS-05.01',
    'SUB_08_FINISHING_PLASTER',
    'Subhead 08: Plastering & Finishes',
    '15 mm cement plaster on rough side of single or half brick wall of mix: 1:6 (1 cement: 6 fine sand) all complete.',
    'IFC_PLASTER_FINISH',
    '6C3e$x7Bi2H1hR_08h',
    'DWG-ARC-FIN-501',
    'sqm',
    42500.000,
    NULL,
    'CPWD_DSR_2023',
    298.00,
    1.1850,
    0.986,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'SANCTIONED',
    'Two-coat external waterproof plaster with polypropylene fibers for crack control.',
    'Er. Rajesh Srivastava'
  ),
  (
    'boq-lko-009',
    'PRJ-LKO-TOWER-A',
    'MR-FA-01',
    'WBS-06.01',
    'SUB_08_FINISHING_PLASTER',
    'Subhead 08: Plastering & Finishes',
    'Unitized Double Glazed Low-E Structural Façade with 32mm DGU (6mm Toughened + 16mm Argon + 6mm Toughened) with thermal-break aluminium mullions (Non-DSR Market Analyzed).',
    'IFC_SHEAR_WALL',
    '5B4f$y8Cj1G0iS_09i',
    'DWG-ARC-FCD-601',
    'sqm',
    9800.000,
    NULL,
    'NON_DSR_MARKET_ANALYZED',
    11200.00,
    1.0500,
    0.965,
    'BIM_IFC_GEOMETRY_PARSER_V3',
    'ESTIMATOR_VERIFIED',
    'Market analyzed rate based on 3 certified vendor quotes (Saint Gobain/Schüco).',
    'Er. Rajesh Srivastava'
  )
ON CONFLICT (id) DO NOTHING;
