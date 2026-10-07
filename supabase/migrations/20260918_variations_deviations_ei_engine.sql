-- =============================================================================
-- Migration: 20260918_variations_deviations_ei_engine
-- Module   : Contract Variations, Deviation Statement & Extra Item Rate Analysis
-- Ref      : CPWD GCC Clause 12 / FIDIC Red Book Clause 13
-- Strategy : Fully idempotent
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.variation_order_status AS ENUM ('DRAFT','PENDING_EIC_APPROVAL','APPROVED','PARTIALLY_EXECUTED','FULLY_EXECUTED','WITHDRAWN','DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vo_initiating_authority AS ENUM ('ENGINEER_IN_CHARGE','EXECUTIVE_ENGINEER','SUPERINTENDING_ENGINEER','CHIEF_ENGINEER','MANAGING_DIRECTOR','CLIENT_NOMINATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deviation_category AS ENUM ('SUBSTRUCTURE','SUPERSTRUCTURE','FINISHING','EXTERNAL_SERVICES','PROVISIONAL_ITEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ei_sanction_status AS ENUM ('UNDER_ANALYSIS','SUBMITTED_FOR_SANCTION','EIC_SANCTIONED','EE_SANCTIONED','MD_SANCTIONED','CLIENT_APPROVED','REJECTED','INCORPORATED_IN_VO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.contract_variation_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL,
  vo_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  initiating_authority public.vo_initiating_authority NOT NULL,
  initiated_by_name TEXT NOT NULL,
  contract_value_at_award NUMERIC(18,2) NOT NULL,
  cost_delta_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cumulative_vo_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  eot_requested_days INTEGER NOT NULL DEFAULT 0,
  eot_granted_days INTEGER NOT NULL DEFAULT 0,
  cl12_notice_date DATE,
  cl12_notice_served BOOLEAN NOT NULL DEFAULT FALSE,
  rate_determination_method TEXT NOT NULL DEFAULT 'BOQ_RATE',
  fidic_cl13_engineer_instruction TEXT,
  justification_notes TEXT,
  status public.variation_order_status NOT NULL DEFAULT 'DRAFT',
  approved_by TEXT,
  approval_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_deviation_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL,
  vo_id TEXT REFERENCES public.contract_variation_orders(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  unit TEXT NOT NULL,
  deviation_category public.deviation_category NOT NULL,
  schedule_f_limit_pct NUMERIC(6,2) NOT NULL,
  agreement_quantity NUMERIC(18,4) NOT NULL,
  executed_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  agreement_rate NUMERIC(14,4) NOT NULL,
  market_derived_rate NUMERIC(14,4),
  rate_dispute_notice_date DATE,
  rate_dispute_notice_served BOOLEAN NOT NULL DEFAULT FALSE,
  extra_item_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extra_item_rate_analyses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL,
  ei_code TEXT NOT NULL UNIQUE,
  item_description TEXT NOT NULL,
  unit TEXT NOT NULL,
  material_lines JSONB NOT NULL DEFAULT '[]',
  material_subtotal NUMERIC(14,4) NOT NULL DEFAULT 0,
  carriage_amount NUMERIC(14,4) NOT NULL DEFAULT 0,
  labour_lines JSONB NOT NULL DEFAULT '[]',
  labour_subtotal NUMERIC(14,4) NOT NULL DEFAULT 0,
  machinery_amount NUMERIC(14,4) NOT NULL DEFAULT 0,
  water_electricity_amount NUMERIC(14,4) NOT NULL DEFAULT 0,
  cp_oh_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  sanction_status public.ei_sanction_status NOT NULL DEFAULT 'UNDER_ANALYSIS',
  prepared_by TEXT NOT NULL,
  checked_by TEXT,
  eic_sanctioned_by TEXT,
  eic_sanction_date DATE,
  ee_sanctioned_by TEXT,
  ee_sanction_date DATE,
  md_sanctioned_by TEXT,
  md_sanction_date DATE,
  sanctioned_rate NUMERIC(14,4),
  dsr_year TEXT,
  dsr_chapter TEXT,
  dsr_item_number TEXT,
  market_rate_basis TEXT,
  notes TEXT,
  vo_incorporated_id TEXT REFERENCES public.contract_variation_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vo_project   ON public.contract_variation_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_vo_status    ON public.contract_variation_orders(status);
CREATE INDEX IF NOT EXISTS idx_dev_project  ON public.contract_deviation_items(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_vo       ON public.contract_deviation_items(vo_id);
CREATE INDEX IF NOT EXISTS idx_dev_cat      ON public.contract_deviation_items(deviation_category);
CREATE INDEX IF NOT EXISTS idx_ei_project   ON public.extra_item_rate_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_ei_status    ON public.extra_item_rate_analyses(sanction_status);

CREATE OR REPLACE FUNCTION public.update_variations_updated_at() RETURNS TRIGGER AS $func$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $func$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_vo_updated_at  ON public.contract_variation_orders;
CREATE TRIGGER trg_vo_updated_at  BEFORE UPDATE ON public.contract_variation_orders  FOR EACH ROW EXECUTE FUNCTION public.update_variations_updated_at();
DROP TRIGGER IF EXISTS trg_dev_updated_at ON public.contract_deviation_items;
CREATE TRIGGER trg_dev_updated_at BEFORE UPDATE ON public.contract_deviation_items   FOR EACH ROW EXECUTE FUNCTION public.update_variations_updated_at();
DROP TRIGGER IF EXISTS trg_ei_updated_at  ON public.extra_item_rate_analyses;
CREATE TRIGGER trg_ei_updated_at  BEFORE UPDATE ON public.extra_item_rate_analyses   FOR EACH ROW EXECUTE FUNCTION public.update_variations_updated_at();

ALTER TABLE public.contract_variation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_deviation_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_item_rate_analyses  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow read contract_variation_orders"  ON public.contract_variation_orders;
  CREATE POLICY "Allow read contract_variation_orders"  ON public.contract_variation_orders  FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write contract_variation_orders" ON public.contract_variation_orders;
  CREATE POLICY "Allow write contract_variation_orders" ON public.contract_variation_orders  FOR ALL USING (true);
  DROP POLICY IF EXISTS "Allow read contract_deviation_items"   ON public.contract_deviation_items;
  CREATE POLICY "Allow read contract_deviation_items"   ON public.contract_deviation_items   FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write contract_deviation_items"  ON public.contract_deviation_items;
  CREATE POLICY "Allow write contract_deviation_items"  ON public.contract_deviation_items   FOR ALL USING (true);
  DROP POLICY IF EXISTS "Allow read extra_item_rate_analyses"   ON public.extra_item_rate_analyses;
  CREATE POLICY "Allow read extra_item_rate_analyses"   ON public.extra_item_rate_analyses   FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow write extra_item_rate_analyses"  ON public.extra_item_rate_analyses;
  CREATE POLICY "Allow write extra_item_rate_analyses"  ON public.extra_item_rate_analyses   FOR ALL USING (true);
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_variation_orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_deviation_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.extra_item_rate_analyses;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

INSERT INTO public.contract_variation_orders (id,project_id,vo_number,title,description,initiating_authority,initiated_by_name,contract_value_at_award,cost_delta_amount,cumulative_vo_percent,eot_requested_days,eot_granted_days,cl12_notice_date,cl12_notice_served,rate_determination_method,fidic_cl13_engineer_instruction,justification_notes,status,approved_by,approval_date) VALUES
('vo-lko-001','PRJ-LKO-TOWER-A','VO/LKO/2026/001','Additional Raft Foundation Depth — Rock Encountered at -4.2m','Rock strata encountered at -4.2m BGL. EIC directed raft thickness increase 600mm to 900mm per geotech report GR-042.','ENGINEER_IN_CHARGE','Er. Amresh Kumar Tiwari, EIC-Class I',147500000.00,8250000.00,5.593,18,18,'2025-11-15',TRUE,'MARKET_RATE','EI/FIDIC/13.1/2025/LKO-004 — Additional raft depth due to unforeseen rock strata','Deviation confirmed by IIT Kanpur GR-042. Rate analysed against DSR 2021-22 Chapter 2.','FULLY_EXECUTED','Er. Rajesh Srivastava (Project Director)','2025-11-20'),
('vo-lko-002','PRJ-LKO-TOWER-A','VO/LKO/2026/002','Change in Partition Walls — AAC Blocks replacing Brick Masonry','Client directed substitution: 4" brick to 100mm AAC blocks for thermal efficiency across 14 floors.','EXECUTIVE_ENGINEER','Er. Sunita Rathore, EE Civil Division',147500000.00,-3180000.00,-2.156,0,0,'2026-01-10',TRUE,'BOQ_RATE','EI/FIDIC/13.1/2026/LKO-011 — Material substitution AAC vs brick','Net omission after AAC addition vs brick omission. No time impact.','APPROVED','Er. Amresh Kumar Tiwari, EIC-Class I','2026-01-18'),
('vo-lko-003','PRJ-LKO-TOWER-A','VO/LKO/2026/003','Extra Item — ACP Cladding on Podium Facade P1–P4','Architect directed 3mm PVDF ACP cladding on podium P1-P4. No BOQ equivalent; EI rate analysis prepared.','MANAGING_DIRECTOR','Mr. Vikram Agarwal, MD — Quadillar Infrastructure Ltd',147500000.00,5620000.00,3.810,12,10,'2026-02-01',TRUE,'MARKET_RATE','EI/FIDIC/13.3/2026/LKO-019 — Extra Item: ACP Cladding not in BOQ','Rate via EI/LKO/2026/001 from 3 vendors. 15% CP&OH applied.','PARTIALLY_EXECUTED','Er. Rajesh Srivastava (Project Director)','2026-02-10'),
('vo-lko-004','PRJ-LKO-TOWER-A','VO/LKO/2026/004','Deviation — RCC Column Concrete Grade M35 to M40 (G+6 to G+14)','Structural consultant upgraded column concrete M35 to M40 for upper floors per revised wind load assessment IS:1893.','ENGINEER_IN_CHARGE','Er. Amresh Kumar Tiwari, EIC-Class I',147500000.00,2940000.00,1.993,0,0,'2026-03-01',TRUE,'DSR_RATE','EI/FIDIC/13.1/2026/LKO-022 — Concrete grade upgrade M35 to M40','Rate differential from DSR 2021-22 Schedule B adjusted with SCCCI index UP Lucknow Zone.','DRAFT',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contract_deviation_items (id,project_id,vo_id,item_code,item_description,unit,deviation_category,schedule_f_limit_pct,agreement_quantity,executed_quantity,agreement_rate,market_derived_rate,rate_dispute_notice_date,rate_dispute_notice_served,extra_item_ref,notes) VALUES
('dev-lko-001','PRJ-LKO-TOWER-A','vo-lko-001','BOQ/STR/001','PCC M15 blinding under raft foundation including compaction','m3','SUBSTRUCTURE',100.00,1200.00,1540.00,4250.00,NULL,NULL,FALSE,NULL,'Blinding quantum increased due to rock profile irregularity. Within 100% substructure Schedule F limit.'),
('dev-lko-002','PRJ-LKO-TOWER-A','vo-lko-001','BOQ/STR/002','RCC M30 raft foundation 900mm thick including formwork','m3','SUBSTRUCTURE',100.00,850.00,1190.00,9800.00,NULL,NULL,FALSE,NULL,'Raft increased 600 to 900mm per VO/LKO/2026/001. Within 100% substructure limit.'),
('dev-lko-003','PRJ-LKO-TOWER-A','vo-lko-002','BOQ/FIN/014','Brick masonry CM 1:4 internal partition walls 115mm thick','m3','SUPERSTRUCTURE',30.00,3200.00,2240.00,4100.00,NULL,NULL,FALSE,NULL,'Reduction per VO/LKO/2026/002. Net omission reduces bill value.'),
('dev-lko-004','PRJ-LKO-TOWER-A','vo-lko-002','BOQ/FIN/015','AAC block masonry 100mm thick including jointing mortar','m2','SUPERSTRUCTURE',30.00,0.00,9800.00,620.00,NULL,NULL,FALSE,NULL,'New item by VO/LKO/2026/002. Zero BOQ qty; extra item at agreed VO rate.'),
('dev-lko-005','PRJ-LKO-TOWER-A','vo-lko-004','BOQ/STR/018','RCC M35 concrete for columns including pumping and vibration (G+6 to G+14)','m3','SUPERSTRUCTURE',30.00,1480.00,1960.00,8200.00,9180.00,'2026-03-15',TRUE,NULL,'ALERT: Exceeds Schedule F 30% superstructure limit by 2.43%. Excess billed at M40 market-derived rate per EIC direction.'),
('dev-lko-006','PRJ-LKO-TOWER-A','vo-lko-004','BOQ/STR/019','RCC M35 concrete for beams and slabs including pumping and curing (G+6 to G+14)','m3','SUPERSTRUCTURE',30.00,2100.00,2600.00,7800.00,8720.00,NULL,FALSE,NULL,'WARNING: Approaching Schedule F 30% limit (23.8%). Expected breach at G+13. Rate notice preparation recommended.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.extra_item_rate_analyses (id,project_id,ei_code,item_description,unit,material_lines,material_subtotal,carriage_amount,labour_lines,labour_subtotal,machinery_amount,water_electricity_amount,cp_oh_percent,sanction_status,prepared_by,checked_by,eic_sanctioned_by,eic_sanction_date,ee_sanctioned_by,ee_sanction_date,md_sanctioned_by,md_sanction_date,sanctioned_rate,dsr_year,dsr_chapter,dsr_item_number,market_rate_basis,notes) VALUES
('ei-lko-001','PRJ-LKO-TOWER-A','EI/LKO/2026/001','Supply and fixing 3mm ACP PVDF coated cladding with aluminium sub-frame on podium facade','m2','[{"description":"3mm ACP panel PVDF coated","quantity":1.12,"unit":"m2","rate":2200,"amount":2464},{"description":"65x65x3mm aluminium box section sub-frame","quantity":3.6,"unit":"Rmt","rate":185,"amount":666},{"description":"Structural silicone sealant Dow Corning 795","quantity":0.18,"unit":"kg","rate":680,"amount":122.4},{"description":"Anchor fasteners M8x100 FRP coated","quantity":6,"unit":"Nos","rate":28,"amount":168},{"description":"EPDM gaskets and backing rod","quantity":1.0,"unit":"m2","rate":95,"amount":95}]'::JSONB,3515.40,175.77,'[{"category":"Skilled Aluminium Fabricator","coefficient_per_unit":0.28,"daily_rate":950,"amount":266},{"category":"Unskilled Helper","coefficient_per_unit":0.14,"daily_rate":620,"amount":86.8},{"category":"Rigger Rope Access Technician","coefficient_per_unit":0.08,"daily_rate":1200,"amount":96}]'::JSONB,448.80,85.00,24.00,15.00,'MD_SANCTIONED','Vikas Bansal, FCA (QS)','Er. Amresh Kumar Tiwari, EIC','Er. Amresh Kumar Tiwari, EIC','2026-02-05','Er. Sunita Rathore, EE','2026-02-08','Mr. Vikram Agarwal, MD','2026-02-10',4882.00,'2021-22','Chapter 18 — Aluminium Works','DSR-18.5.2','Market quotations from 3 CPWD-empanelled ACP vendors. Weighted average used.','Rate includes supply, fixing, jointing and 1-year warranty on sealant.'),
('ei-lko-002','PRJ-LKO-TOWER-A','EI/LKO/2026/002','Anti-carbonation elastomeric coating on external RCC surfaces 2 coats','m2','[{"description":"Elastomeric bridging primer","quantity":0.35,"unit":"kg","rate":420,"amount":147},{"description":"Elastomeric top coat silicone-acrylic 2 coats","quantity":0.55,"unit":"kg","rate":580,"amount":319},{"description":"Masonry primer alkali-resistant","quantity":0.12,"unit":"kg","rate":280,"amount":33.6},{"description":"Consumables brushes tape","quantity":1,"unit":"Lot","rate":18,"amount":18}]'::JSONB,517.60,25.88,'[{"category":"Skilled Painter","coefficient_per_unit":0.06,"daily_rate":880,"amount":52.8},{"category":"Unskilled Helper","coefficient_per_unit":0.03,"daily_rate":620,"amount":18.6}]'::JSONB,71.40,0.00,12.00,15.00,'EIC_SANCTIONED','Vikas Bansal, FCA (QS)','Er. Amresh Kumar Tiwari, EIC','Er. Amresh Kumar Tiwari, EIC','2026-04-02',NULL,NULL,NULL,NULL,741.00,'2021-22','Chapter 12 — Painting','DSR-12.8.1','Market quotations: Sika Elastocolor Rs418/kg, Dr Fixit Rs405/kg, Asian Paints Damp X Rs438/kg.','Spec mandated by PMC for all external RCC above G+6. IS:13935.'),
('ei-lko-003','PRJ-LKO-TOWER-A','EI/LKO/2026/003','Polished natural granite flooring 18mm thick with cement-based adhesive in lobbies','m2','[{"description":"Black Pearl Granite 600x600x18mm polished","quantity":1.05,"unit":"m2","rate":1850,"amount":1942.5},{"description":"Cement-based tile adhesive C2 grade","quantity":5.0,"unit":"kg","rate":14,"amount":70},{"description":"Epoxy grout Mapei Kerapoxy 3mm joint","quantity":0.35,"unit":"kg","rate":480,"amount":168},{"description":"Cement and river sand bedding 25mm avg","quantity":0.028,"unit":"m3","rate":4800,"amount":134.4}]'::JSONB,2314.90,115.75,'[{"category":"Skilled Granite Fixer","coefficient_per_unit":0.15,"daily_rate":1050,"amount":157.5},{"category":"Unskilled Helper","coefficient_per_unit":0.10,"daily_rate":620,"amount":62}]'::JSONB,219.50,0.00,18.00,15.00,'SUBMITTED_FOR_SANCTION','Vikas Bansal, FCA (QS)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-22','Chapter 11 — Flooring','DSR-11.14','Granite mine-gate price plus freight Rajasthan-Lucknow Rs220/m2.','Rate pending EIC review. Granite grade pre-approved by client consultant 10-Apr-2026.')
ON CONFLICT (id) DO NOTHING;
