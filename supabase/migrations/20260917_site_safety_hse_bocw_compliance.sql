-- ====================================================================================
-- Quadillar LiveView: Site Safety, Health & Environment (HSE) & BOCW Compliance
-- Standards: Building and Other Construction Workers (BOCW) Act, 1996 & Central Rules 1998
--            IS 3696 (Parts 1 & 2): Safety Code for Scaffolds and Ladders
--            IS 11057 / IS 3521: Industrial Safety Belts, Harnesses and Fall Arresters
--            CPWD Safety Code Clauses 19-C & 19-D (Safety Precautions & Labour Welfare)
-- ====================================================================================

-- 1. Create Domain Enums (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safety_incident_severity') THEN
        CREATE TYPE safety_incident_severity AS ENUM (
            'NEAR_MISS', 
            'MINOR_FIRST_AID', 
            'MAJOR_MEDICAL', 
            'FATALITY'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safety_incident_status') THEN
        CREATE TYPE safety_incident_status AS ENUM (
            'REPORTED', 
            'UNDER_INVESTIGATION', 
            'CAPA_ASSIGNED', 
            'CLOSED_RESOLVED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bocw_compliance_status') THEN
        CREATE TYPE bocw_compliance_status AS ENUM (
            'FULL_COMPLIANCE', 
            'PARTIAL_DEFICIENCY', 
            'NON_COMPLIANT', 
            'NOT_APPLICABLE'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ppe_audit_rating') THEN
        CREATE TYPE ppe_audit_rating AS ENUM (
            'COMPLIANT', 
            'CONDITIONAL_WARNING', 
            'STOP_WORK_NOTICE'
        );
    END IF;
END $$;

-- 2. Create Table: site_safety_incidents
CREATE TABLE IF NOT EXISTS site_safety_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_ref TEXT UNIQUE NOT NULL,
    project_id TEXT NOT NULL,
    incident_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    incident_title TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    severity_level TEXT NOT NULL, -- NEAR_MISS, MINOR_FIRST_AID, MAJOR_MEDICAL, FATALITY
    affected_personnel TEXT,
    contractor_name TEXT NOT NULL,
    incident_description TEXT NOT NULL,
    root_cause_analysis TEXT,
    immediate_actions_taken TEXT NOT NULL,
    preventive_measures_capa TEXT,
    photo_evidence_urls TEXT[] DEFAULT '{}',
    statutory_reporting_required BOOLEAN DEFAULT FALSE,
    statutory_notified_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'REPORTED', -- REPORTED, UNDER_INVESTIGATION, CAPA_ASSIGNED, CLOSED_RESOLVED
    safety_officer_name TEXT NOT NULL,
    resident_engineer_name TEXT NOT NULL,
    days_lost INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Table: ppe_compliance_logs
CREATE TABLE IF NOT EXISTS ppe_compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_ref TEXT UNIQUE NOT NULL,
    project_id TEXT NOT NULL,
    audit_date DATE NOT NULL,
    zone_location TEXT NOT NULL,
    auditor_name TEXT NOT NULL,
    total_workers_inspected INTEGER NOT NULL,
    helmet_compliance_count INTEGER NOT NULL,
    safety_shoes_compliance_count INTEGER NOT NULL,
    high_vis_vest_compliance_count INTEGER NOT NULL,
    harness_at_height_count INTEGER NOT NULL,
    eye_face_protection_count INTEGER NOT NULL,
    ear_protection_count INTEGER NOT NULL,
    overall_compliance_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    violations_detected TEXT[] DEFAULT '{}',
    stop_work_notices_issued INTEGER DEFAULT 0,
    contractor_penalties_incurred NUMERIC(12,2) DEFAULT 0.00,
    audit_rating TEXT NOT NULL DEFAULT 'COMPLIANT', -- COMPLIANT, CONDITIONAL_WARNING, STOP_WORK_NOTICE
    corrective_actions_demanded TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Table: safety_toolbox_talks
CREATE TABLE IF NOT EXISTS safety_toolbox_talks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talk_ref TEXT UNIQUE NOT NULL,
    project_id TEXT NOT NULL,
    talk_date DATE NOT NULL,
    hazard_topic TEXT NOT NULL,
    is_code_ref TEXT, -- e.g. IS 3696 Scaffolding, IS 11057 Fall Protection
    trainer_name TEXT NOT NULL,
    trainer_designation TEXT NOT NULL,
    total_attendees INTEGER NOT NULL,
    trade_category TEXT NOT NULL, -- e.g. Steel Fixers, Scaffolders, Masons, Electricians, Crane Riggers
    language_delivered TEXT NOT NULL DEFAULT 'Hindi & English',
    key_safety_points TEXT[] NOT NULL DEFAULT '{}',
    attendee_signatures_logged INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Table: bocw_statutory_checklists
CREATE TABLE IF NOT EXISTS bocw_statutory_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id TEXT UNIQUE NOT NULL,
    project_id TEXT NOT NULL,
    statutory_rule_ref TEXT NOT NULL, -- e.g. BOCW Rule 34, BOCW Rule 39, IS 3696 Part 1
    category TEXT NOT NULL, -- FIRST_AID, FIRE_SAFETY, FALL_PROTECTION, SANITATION_WELFARE, ELECTRICAL, HEAVY_MACHINERY
    item_description TEXT NOT NULL,
    compliance_status TEXT NOT NULL DEFAULT 'FULL_COMPLIANCE', -- FULL_COMPLIANCE, PARTIAL_DEFICIENCY, NON_COMPLIANT, NOT_APPLICABLE
    evidence_details TEXT NOT NULL,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    rectification_target_date DATE,
    verifying_officer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_safety_incidents_proj ON site_safety_incidents(project_id, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_sev ON site_safety_incidents(severity_level, status);
CREATE INDEX IF NOT EXISTS idx_ppe_logs_proj ON ppe_compliance_logs(project_id, audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_proj ON safety_toolbox_talks(project_id, talk_date DESC);
CREATE INDEX IF NOT EXISTS idx_bocw_checklist_proj ON bocw_statutory_checklists(project_id, category);

-- 7. Trigger: Auto Compute PPE Overall Compliance Percentage
CREATE OR REPLACE FUNCTION fn_compute_ppe_compliance_pct()
RETURNS TRIGGER AS $$
DECLARE
    total_checks NUMERIC;
    total_passes NUMERIC;
BEGIN
    IF NEW.total_workers_inspected > 0 THEN
        total_checks := NEW.total_workers_inspected * 6.0; -- 6 key gear checks
        total_passes := NEW.helmet_compliance_count + 
                        NEW.safety_shoes_compliance_count + 
                        NEW.high_vis_vest_compliance_count + 
                        NEW.harness_at_height_count + 
                        NEW.eye_face_protection_count + 
                        NEW.ear_protection_count;
        NEW.overall_compliance_pct := ROUND((total_passes / total_checks) * 100.0, 2);

        IF NEW.overall_compliance_pct < 85.0 THEN
            NEW.audit_rating := 'STOP_WORK_NOTICE';
        ELSIF NEW.overall_compliance_pct < 95.0 THEN
            NEW.audit_rating := 'CONDITIONAL_WARNING';
        ELSE
            NEW.audit_rating := 'COMPLIANT';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_ppe_compliance_pct ON ppe_compliance_logs;
CREATE TRIGGER trg_compute_ppe_compliance_pct
    BEFORE INSERT OR UPDATE ON ppe_compliance_logs
    FOR EACH ROW
    EXECUTE FUNCTION fn_compute_ppe_compliance_pct();

-- 8. Row Level Security (RLS)
ALTER TABLE site_safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bocw_statutory_checklists ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read-write for site_safety_incidents" ON site_safety_incidents;
    CREATE POLICY "Allow public read-write for site_safety_incidents" 
        ON site_safety_incidents FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public read-write for ppe_compliance_logs" ON ppe_compliance_logs;
    CREATE POLICY "Allow public read-write for ppe_compliance_logs" 
        ON ppe_compliance_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public read-write for safety_toolbox_talks" ON safety_toolbox_talks;
    CREATE POLICY "Allow public read-write for safety_toolbox_talks" 
        ON safety_toolbox_talks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public read-write for bocw_statutory_checklists" ON bocw_statutory_checklists;
    CREATE POLICY "Allow public read-write for bocw_statutory_checklists" 
        ON bocw_statutory_checklists FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 9. Realtime Publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE site_safety_incidents;
    EXCEPTION WHEN duplicate_object THEN
        -- already member
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE ppe_compliance_logs;
    EXCEPTION WHEN duplicate_object THEN
        -- already member
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE safety_toolbox_talks;
    EXCEPTION WHEN duplicate_object THEN
        -- already member
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE bocw_statutory_checklists;
    EXCEPTION WHEN duplicate_object THEN
        -- already member
    END;
END $$;

-- 10. Seed Data for Project PRJ-LKO-TOWER-A
-- Incidents
INSERT INTO site_safety_incidents (
    incident_ref, project_id, incident_date, location, incident_title, incident_type, 
    severity_level, affected_personnel, contractor_name, incident_description, root_cause_analysis, 
    immediate_actions_taken, preventive_measures_capa, statutory_reporting_required, status, 
    safety_officer_name, resident_engineer_name, days_lost
) VALUES
(
    'INC-2026-001', 'PRJ-LKO-TOWER-A', NOW() - INTERVAL '18 days', 'Tower A - 12th Floor Edge', 
    'Near-Miss: Unsecured Shuttering Clamp Dislodged', 'FALL_OF_MATERIAL', 'NEAR_MISS', 
    'None (Area barricaded below)', 'Larsen & Toubro Ltd', 
    'A quick-release steel shuttering clamp slipped from the outer formwork edge during peripheral beam erection and landed into the safety debris net at 10th floor level.', 
    'Scaffolder failed to tie off loose formwork components before handling; secondary tool lanyard was not secured to harness anchor.', 
    'All perimeter edge work suspended immediately; safety net inspected for tears and debris cleared.', 
    'Mandatory secondary tool tethering protocol instituted for all work above 10m; 100% net catch audits scheduled weekly.', 
    FALSE, 'CLOSED_RESOLVED', 'Er. Mahendra Singh', 'Er. S. P. Verma', 0
),
(
    'INC-2026-002', 'PRJ-LKO-TOWER-A', NOW() - INTERVAL '12 days', 'Central Steel Yard - Cutting Bay', 
    'Minor Hand Abrasions During Rebar Shearing', 'MECHANICAL_PINCH', 'MINOR_FIRST_AID', 
    'Ram Kumar (Rebar Fitter)', 'Shapoorji Pallonji & Co', 
    'Operative suffered minor skin abrasion on the left palm while feeding 25mm TMT bar into the automated shearing machine due to torn cut-resistant glove.', 
    'Worn-out cut-resistant leather gloves; operative failed to request replacement prior to shift start.', 
    'Immediate first aid treatment administered at site dispensary with antiseptic dressing and anti-tetanus toxoid vaccination.', 
    'Store issued new ANSI Level 4 cut-resistant gloves; machine feeding guide clearance recalibrated.', 
    FALSE, 'CLOSED_RESOLVED', 'Er. Mahendra Singh', 'Er. S. P. Verma', 0
),
(
    'INC-2026-003', 'PRJ-LKO-TOWER-A', NOW() - INTERVAL '5 days', 'Basement 2 - Sump Pit Excavation', 
    'Near-Miss: Localized Soil Soughing at Sump Bank', 'EXCAVATION_COLLAPSE', 'NEAR_MISS', 
    'None (Work stopped timely)', 'Ahluwalia Contracts Ltd', 
    'Minor soil spalling occurred along the un-shored lip of the 3.5m sump pit following unexpected seepage from ground water table recharge.', 
    'Inadequate batter angle of trench lip combined with unintercepted underground dewatering seepage.', 
    'Work halted; workers evacuated; 2 submersible pumps deployed for emergency drawdown.', 
    'Mandatory trench box shoring installed per CPWD Excavation Guidelines; geotech stability check conducted.', 
    FALSE, 'CLOSED_RESOLVED', 'Er. Mahendra Singh', 'Er. S. P. Verma', 0
),
(
    'INC-2026-004', 'PRJ-LKO-TOWER-A', NOW() - INTERVAL '2 days', 'Tower A - 15th Floor Core Wall', 
    'Non-Compliant Scaffolding Coupler Identified', 'FALL_HAZARD', 'NEAR_MISS', 
    'None', 'Larsen & Toubro Ltd', 
    'Routine audit found cracked drop-forged right-angle coupler connecting ledger to standard on external cantilever staging.', 
    'Substandard batch of uncertified couplers mixed with certified BS 1139 fittings during store issue.', 
    'Entire external scaffold bay tagged "DO NOT USE" (Red Scafftag); defective coupler replaced with stamped coupler.', 
    'Comprehensive NDT and magnetic particle inspection ordered for all staging couplers in store yard; supplier issued non-conformance notice.', 
    FALSE, 'UNDER_INVESTIGATION', 'Er. Mahendra Singh', 'Er. S. P. Verma', 0
),
(
    'INC-2026-005', 'PRJ-LKO-TOWER-A', NOW() - INTERVAL '1 day', 'Electrical Substation Building', 
    'Near-Miss: Transient Arc Flash at Temporary DB', 'ELECTRICAL_FLASH', 'NEAR_MISS', 
    'Deepak Sharma (Electrician)', 'Voltas Electro-Mech Ltd', 
    'Minor spark flash occurred when resetting a 63A 4-pole ELCB on temporary distribution board due to moisture condensation in junction gland.', 
    'IP65 weatherproof gland seal had decayed; rubber gasket was missing after cable rerouting.', 
    'DB immediately isolated via upstream Lockout/Tagout (LOTO); thermal imaging scan performed on all terminal connections.', 
    'Replaced temporary DB enclosure with IP67 FRP box; daily humidity and insulation resistance (Megger) checks mandated.', 
    FALSE, 'CAPA_ASSIGNED', 'Er. Mahendra Singh', 'Er. S. P. Verma', 0
),
(
    'INC-2026-006', 'PRJ-LKO-TOWER-A', NOW() - INTERVAL '4 hours', 'Tower A - 16th Floor Slab Shuttering', 
    'Sprained Ankle on Unlevel Rebar Mat', 'SLIP_TRIP_FALL', 'MINOR_FIRST_AID', 
    'Suresh Yadav (Steel Binder)', 'Larsen & Toubro Ltd', 
    'Worker twisted his right ankle while walking over top distribution mesh of beam junction prior to installation of wooden duckboard walkways.', 
    'Absence of dedicated wooden walking boards across dense multi-layer reinforcement cages.', 
    'Immediate cold compression applied; escorted to site medical centre; X-ray confirmed soft tissue strain with no fracture.', 
    'Installation of lightweight plywood walkway ramps made compulsory across all active slab reinforcement mats prior to tieing.', 
    FALSE, 'REPORTED', 'Er. Mahendra Singh', 'Er. S. P. Verma', 0
)
ON CONFLICT (incident_ref) DO NOTHING;

-- PPE Compliance Logs
INSERT INTO ppe_compliance_logs (
    audit_ref, project_id, audit_date, zone_location, auditor_name, total_workers_inspected, 
    helmet_compliance_count, safety_shoes_compliance_count, high_vis_vest_compliance_count, 
    harness_at_height_count, eye_face_protection_count, ear_protection_count, 
    violations_detected, stop_work_notices_issued, contractor_penalties_incurred, 
    corrective_actions_demanded
) VALUES
(
    'PPE-2026-0916-01', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '1 day', 'Tower A - 14th & 15th Floors', 
    'Er. Mahendra Singh', 48, 48, 48, 48, 46, 45, 47, 
    ARRAY['2 workers wearing full body harness without tying off to static lifeline', '3 welders without secondary shade goggles'], 
    0, 2500.00, 'Immediate tethering to inertia reel lifelines enforced; welding supervisor reprimanded.'
),
(
    'PPE-2026-0915-02', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '2 days', 'Central Steel Fabrication Yard', 
    'Vijay Chauhan (Safety Officer)', 36, 36, 36, 36, 36, 33, 34, 
    ARRAY['3 grinder operators with pitted face shields'], 
    0, 1500.00, 'Defective face shields confiscated; new polycarbonate shields issued from stores.'
),
(
    'PPE-2026-0914-03', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '3 days', 'RMC Batching Plant & Aggregate Stockpile', 
    'Er. Mahendra Singh', 24, 24, 24, 24, 24, 24, 23, 
    ARRAY['1 loader operator not wearing ear defenders during aggregate dumping'], 
    0, 500.00, 'Ear muffs issued and fit-tested immediately.'
),
(
    'PPE-2026-0913-04', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '4 days', 'Basement 1 & 2 MEP Services Bay', 
    'Vijay Chauhan (Safety Officer)', 32, 32, 31, 32, 32, 30, 31, 
    ARRAY['1 pipe welder helper with damaged safety shoes', '2 workers without safety glasses during overhead drilling'], 
    0, 2000.00, 'Helper sent to store for new steel-toe boots before re-entering basement.'
),
(
    'PPE-2026-0912-05', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '5 days', 'Tower A - External Perimeter Scaffolding', 
    'Er. Mahendra Singh', 28, 28, 28, 28, 28, 27, 28, 
    ARRAY['1 scaffolder working without chin strap secured'], 
    0, 1000.00, 'Helmet chin strap fastened; scaffolder briefed on wind hazards.'
),
(
    'PPE-2026-0910-06', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '7 days', 'Substation & DG Yard Enclosure', 
    'Vijay Chauhan (Safety Officer)', 18, 18, 18, 18, 18, 18, 18, 
    ARRAY['No violations detected. 100% compliance recorded.'], 
    0, 0.00, 'Complimentary safety appreciation certificates awarded to electro-mech team.'
)
ON CONFLICT (audit_ref) DO NOTHING;

-- Safety Toolbox Talks
INSERT INTO safety_toolbox_talks (
    talk_ref, project_id, talk_date, hazard_topic, is_code_ref, trainer_name, 
    trainer_designation, total_attendees, trade_category, language_delivered, 
    key_safety_points, attendee_signatures_logged
) VALUES
(
    'TBT-2026-0917-01', 'PRJ-LKO-TOWER-A', CURRENT_DATE, 'Working at Heights & Dual Lanyard Anchoring', 
    'IS 3696 & IS 11057', 'Er. Mahendra Singh', 'Chief Safety Officer', 74, 'Scaffolders & Formwork Fitters', 
    'Hindi & Bengali', 
    ARRAY[
        '100% tie-off mandatory above 1.8 metres at all times',
        'Inspect harness webbings for chemical burns, cuts, and fraying before donning',
        'Ensure shock absorber pack is intact and not deployed',
        'Anchor only to certified static lifelines or tested scaffold structural tubes'
    ], 74
),
(
    'TBT-2026-0916-02', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '1 day', 'Safe Operation of Bar Bending & Cutting Machines', 
    'IS 3696 & CPWD Cl. 19-D', 'Vijay Chauhan', 'Safety Supervisor', 52, 'Rebar Workers & Cutters', 
    'Hindi', 
    ARRAY[
        'Check emergency stop mushroom button functionality before power-on',
        'Do not wear loose clothing or unbuttoned vests near rotating bending discs',
        'Use proper material support roller stands to avoid rebar whip hazards',
        'Always wear heavy-duty cut-resistant nitrile/leather gloves'
    ], 52
),
(
    'TBT-2026-0915-03', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '2 days', 'Deep Excavation Shoring & Dewatering Pit Safety', 
    'IS 3764 (Trench Safety)', 'Er. Mahendra Singh', 'Chief Safety Officer', 42, 'Earthwork Operatives & Pump Operators', 
    'Hindi', 
    ARRAY[
        'Maintain minimum 1.5m clearance of excavated soil spoils from pit edge',
        'Inspect soil face for cracks and undercutting after every heavy downpour',
        'Access ladders must extend at least 1m above the trench lip',
        'Submersible pump electrical cables must be routed through 30mA RCD'
    ], 42
),
(
    'TBT-2026-0914-04', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '3 days', 'Electrical Lockout/Tagout (LOTO) & Temporary Wiring', 
    'IS 5216 & CEA Regulations', 'Rajesh K. Gupta', 'Senior Electrical Engineer', 38, 'Site Electricians & Plant Operators', 
    'Hindi & English', 
    ARRAY[
        'Padlock and red danger tag mandatory on main breaker before panel servicing',
        'Verify zero electrical energy using calibrated multimeters before contact',
        'All portable tools must have industrial 3-pin industrial plug tops',
        'Report frayed insulation or water ingress immediately'
    ], 38
),
(
    'TBT-2026-0913-05', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '4 days', 'Hot Work, Fire Watch & Acetylene Cylinder Storage', 
    'BOCW Rule 39 & IS 2825', 'Vijay Chauhan', 'Safety Supervisor', 34, 'Welders & Gas Cutters', 
    'Hindi', 
    ARRAY[
        'Flashback arresters mandatory on both cylinder and torch ends',
        'Keep dry chemical powder (DCP) 6kg fire extinguisher within 3m reach',
        'Maintain 30-minute post-work fire watch for smoldering embers',
        'Store oxygen and acetylene cylinders vertically secured with chains'
    ], 34
),
(
    'TBT-2026-0912-06', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '5 days', 'Tower Crane Lifting Protocol & Blind Lift Communications', 
    'IS 13367 & ASME B30.3', 'Er. Mahendra Singh', 'Chief Safety Officer', 46, 'Crane Riggers & Signalmen', 
    'Hindi & English', 
    ARRAY[
        'Inspect wire rope slings and D-shackles for kinking, broken wires or deformation',
        'Only certified signalmen with orange vests to give hand/walkie-talkie signals',
        'Never walk or stand beneath suspended loads; enforce 5m radius exclusion zone',
        'Check crane anemometer; stop lifting if wind speed exceeds 38 km/h'
    ], 46
),
(
    'TBT-2026-0911-07', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '6 days', 'Summer Heat Stress Mitigation & Hydration Regimen', 
    'BOCW Rule 40 (Health)', 'Dr. Alok Nath', 'Site Medical Officer', 88, 'General Construction Operatives', 
    'Hindi', 
    ARRAY[
        'Mandatory ORS hydration breaks every 2 hours during peak sun hours (12 PM - 3 PM)',
        'Recognize symptoms of heat exhaustion: dizziness, rapid pulse, profuse sweating',
        'Rest in designated shaded canopy rest shelters with industrial mist fans',
        'Wear breathable cotton undershirts beneath high-vis safety vests'
    ], 88
),
(
    'TBT-2026-0910-08', 'PRJ-LKO-TOWER-A', CURRENT_DATE - INTERVAL '7 days', 'Confined Space Air Monitoring & Emergency Rescue', 
    'IS 11972 & BOCW Rule 41', 'Er. Mahendra Singh', 'Chief Safety Officer', 28, 'Plumbing & Sump Waterproofing Crew', 
    'Hindi & English', 
    ARRAY[
        'Test oxygen levels (19.5% - 23.5%) and toxic gases (H2S, CO) with 4-gas detector',
        'Forced air ventilation blowers must run continuously during occupancy',
        'Full body harness with tripod rescue winch ready at manhole entry',
        'Stationary standby watchman stationed outside at all times'
    ], 28
)
ON CONFLICT (talk_ref) DO NOTHING;

-- BOCW Statutory Checklists
INSERT INTO bocw_statutory_checklists (
    checklist_id, project_id, statutory_rule_ref, category, item_description, 
    compliance_status, evidence_details, verifying_officer
) VALUES
(
    'BOCW-CHK-01', 'PRJ-LKO-TOWER-A', 'BOCW Central Rules 1998, Rule 34', 'FIRST_AID', 
    'Dedicated Site First Aid Room with Qualified Full-time Nurse, Examination Bed & Ambulance Tie-up', 
    'FULL_COMPLIANCE', 'Dispensary room commissioned at Gate 2 with trained male nurse; MOU active with Apollomedics Super Speciality Hospital Lucknow (5.2 km away).', 
    'Er. Mahendra Singh'
),
(
    'BOCW-CHK-02', 'PRJ-LKO-TOWER-A', 'BOCW Central Rules 1998, Rule 39', 'FIRE_SAFETY', 
    'Adequate Fire Extinguishers, Sand Buckets & Monthly Fire Evacuation Mock Drills', 
    'FULL_COMPLIANCE', '48 DCP (6kg) & 12 CO2 (4.5kg) extinguishers deployed across all active floors and store bays; hydrostatic test certificates valid up to Dec 2026.', 
    'Er. Mahendra Singh'
),
(
    'BOCW-CHK-03', 'PRJ-LKO-TOWER-A', 'IS 3696 (Part 1): 1991', 'FALL_PROTECTION', 
    'Tubular Steel Scaffolding Guardrails, Mid-rails (450mm), Toe-boards (150mm) & Working Decking', 
    'FULL_COMPLIANCE', 'All perimeter staging on Tower A equipped with 1m top-rail, 450mm mid-rail, steel toe-boards, and Green Scafftag inspection tags signed daily.', 
    'Er. S. P. Verma'
),
(
    'BOCW-CHK-04', 'PRJ-LKO-TOWER-A', 'IS 11057 / IS 3521: 1999', 'FALL_PROTECTION', 
    'ISI Marked Full Body Safety Harnesses with Dual Lanyards & 8mm Galvanized Wire Lifelines', 
    'FULL_COMPLIANCE', '100% workers at heights equipped with Karam PN-2002 full body harnesses; testing certificates on record; static wire rope lifelines tensioned at 12kN.', 
    'Er. Mahendra Singh'
),
(
    'BOCW-CHK-05', 'PRJ-LKO-TOWER-A', 'BOCW Central Rules 1998, Rule 40', 'SANITATION_WELFARE', 
    'Clean, Wholesome Drinking Water with RO Purification & Adequate Clean Toilets (1 per 30 workers)', 
    'FULL_COMPLIANCE', 'Commercial 500 LPH RO water plant installed with 4 chilled water dispensing points; 16 water-flushed sanitary toilets connected to municipal sewer.', 
    'Er. S. P. Verma'
),
(
    'BOCW-CHK-06', 'PRJ-LKO-TOWER-A', 'BOCW Central Rules 1998, Rule 230', 'SAFETY_GOVERNANCE', 
    'Bi-weekly Joint Site Safety Committee Meetings with Worker Representatives & Minutes of Meeting', 
    'FULL_COMPLIANCE', 'Site Safety Committee formed with 6 management and 6 labor trade reps; meeting held on 10th September 2026; MOM filed in statutory compliance vault.', 
    'Er. Mahendra Singh'
),
(
    'BOCW-CHK-07', 'PRJ-LKO-TOWER-A', 'CPWD Safety Code Clause 19-C', 'HEAVY_MACHINERY', 
    'Third-Party Load Testing & Competent Person Thorough Examination for Tower Cranes & Hoists', 
    'FULL_COMPLIANCE', 'Tower Crane TC-01 & Passenger Hoist PH-01 certified by Govt Approved Competent Person Er. K. L. Sharma; certificate valid up to March 2027.', 
    'Er. Rajesh Srivastava'
),
(
    'BOCW-CHK-08', 'PRJ-LKO-TOWER-A', 'BOCW Central Rules 1998, Rule 42', 'SANITATION_WELFARE', 
    'Labour Accommodation, Rest Shelters, Crèche Facilities & Canteen for Construction Workers', 
    'FULL_COMPLIANCE', 'Labour colony established at Chinhat yard with pucca brick huts, electricity, solar water heaters, crèche with trained caregiver, and hygienic canteen.', 
    'Er. S. P. Verma'
),
(
    'BOCW-CHK-09', 'PRJ-LKO-TOWER-A', 'IS 5216 (Part 1): 1982', 'ELECTRICAL', 
    '30mA Sensitivity Earth Leakage Circuit Breakers (ELCB/RCD) on all Site Distribution Boards', 
    'PARTIAL_DEFICIENCY', '12 out of 14 distribution boards verified with active 30mA RCDs; 2 temporary lighting boards in Basement 2 require breaker replacement by 19-Sep-2026.', 
    'Rajesh K. Gupta'
),
(
    'BOCW-CHK-10', 'PRJ-LKO-TOWER-A', 'BOCW Act 1996, Section 38', 'OCCUPATIONAL_HEALTH', 
    'Mandatory Pre-Employment & Periodic Medical Examination for Crane Operators & Height Workers', 
    'FULL_COMPLIANCE', 'Audiometric, vision (Snellen chart), blood pressure, and vertigo fitness tests completed for 100% height scaffolders and crane operators; records logged.', 
    'Dr. Alok Nath'
)
ON CONFLICT (checklist_id) DO NOTHING;
