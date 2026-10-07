-- ====================================================================================
-- Quadillar LiveView: Subcontractor E-Tendering, Tender Invitation & 
-- Comparative Statement (CS) Evaluation Engine
-- Standard: CPWD Works Manual Chapters V & VI (Estimates, Tenders & Contracts)
--           FIDIC Red Book Clause 14 & Subcontractor Prequalification Standards
-- ====================================================================================

-- 1. Create Domain Enums (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_package_status') THEN
        CREATE TYPE tender_package_status AS ENUM (
            'DRAFT', 
            'PUBLISHED', 
            'UNDER_EVALUATION', 
            'LOI_ISSUED', 
            'AWARDED', 
            'SCRAPPED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_technical_status') THEN
        CREATE TYPE vendor_technical_status AS ENUM (
            'SUBMITTED', 
            'TECHNICAL_QUALIFIED', 
            'TECHNICAL_DISQUALIFIED', 
            'WITHDRAWN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_financial_rank') THEN
        CREATE TYPE vendor_financial_rank AS ENUM (
            'L1', 
            'L2', 
            'L3', 
            'L4', 
            'L5', 
            'NON_RESPONSIVE', 
            'PENDING'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_variance_category') THEN
        CREATE TYPE rate_variance_category AS ENUM (
            'COMPETITIVE', 
            'BALANCED', 
            'FRONT_LOADED', 
            'ABNORMALLY_HIGH', 
            'ABNORMALLY_LOW'
        );
    END IF;
END $$;

-- 2. Create Table: tender_packages
CREATE TABLE IF NOT EXISTS tender_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    package_code TEXT UNIQUE NOT NULL,
    package_title TEXT NOT NULL,
    scope_of_work TEXT NOT NULL,
    trade_discipline TEXT NOT NULL,
    estimated_budget_inr NUMERIC(15, 2) NOT NULL,
    emd_amount_inr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tender_document_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 10000.00,
    tender_validity_days INTEGER NOT NULL DEFAULT 90,
    published_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    submission_deadline TIMESTAMPTZ NOT NULL,
    technical_bid_opening_date TIMESTAMPTZ NOT NULL,
    financial_bid_opening_date TIMESTAMPTZ,
    procurement_mode TEXT NOT NULL DEFAULT 'OPEN_E_TENDER',
    status TEXT NOT NULL DEFAULT 'UNDER_EVALUATION',
    minimum_technical_score NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
    evaluation_criteria TEXT NOT NULL DEFAULT 'L1 (Lowest Evaluated Substantially Responsive Bidder) with QCBS minimum 70% technical hurdle',
    awarded_vendor_id TEXT,
    awarded_contract_value_inr NUMERIC(15, 2),
    loi_issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Table: vendor_bids
CREATE TABLE IF NOT EXISTS vendor_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_package_id UUID NOT NULL REFERENCES tender_packages(id) ON DELETE CASCADE,
    vendor_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_reg_number TEXT NOT NULL,
    gstin TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    bid_submission_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    emd_paid BOOLEAN NOT NULL DEFAULT true,
    emd_bank_ref TEXT,
    technical_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    technical_status TEXT NOT NULL DEFAULT 'TECHNICAL_QUALIFIED',
    disqualification_reason TEXT,
    total_quoted_amount NUMERIC(15, 2) NOT NULL,
    variance_from_estimate_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    financial_rank TEXT NOT NULL DEFAULT 'PENDING',
    financial_status TEXT NOT NULL DEFAULT 'PENDING',
    proposed_duration_months NUMERIC(4, 1) NOT NULL DEFAULT 18.0,
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    scorecard_technical_compliance NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    scorecard_safety_record NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    scorecard_financial_standing NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    scorecard_plant_machinery NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    composite_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    committee_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tender_package_id, vendor_id)
);

-- 4. Create Table: bid_item_rates
CREATE TABLE IF NOT EXISTS bid_item_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_bid_id UUID NOT NULL REFERENCES vendor_bids(id) ON DELETE CASCADE,
    tender_package_id UUID NOT NULL REFERENCES tender_packages(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    item_description TEXT NOT NULL,
    subhead TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    baseline_dsr_rate_inr NUMERIC(12, 2) NOT NULL,
    baseline_total_amount_inr NUMERIC(15, 2) NOT NULL,
    vendor_quoted_rate_inr NUMERIC(12, 2) NOT NULL,
    vendor_total_amount_inr NUMERIC(15, 2) NOT NULL,
    rate_variance_pct NUMERIC(6, 2) NOT NULL,
    is_lowest_item_rate BOOLEAN NOT NULL DEFAULT false,
    risk_flag TEXT NOT NULL DEFAULT 'COMPETITIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_tender_packages_proj_status ON tender_packages(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tender_packages_code ON tender_packages(package_code);
CREATE INDEX IF NOT EXISTS idx_vendor_bids_pkg_rank ON vendor_bids(tender_package_id, financial_rank);
CREATE INDEX IF NOT EXISTS idx_vendor_bids_vendor_id ON vendor_bids(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bid_item_rates_bid ON bid_item_rates(vendor_bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_item_rates_pkg_item ON bid_item_rates(tender_package_id, item_code);

-- 6. Automated Trigger Function: Calculate Variance and Composite Score
CREATE OR REPLACE FUNCTION trg_calculate_bid_variances()
RETURNS TRIGGER AS $$
DECLARE
    v_estimated_budget NUMERIC(15, 2);
BEGIN
    -- Fetch estimated budget of package
    SELECT estimated_budget_inr INTO v_estimated_budget
    FROM tender_packages
    WHERE id = NEW.tender_package_id;

    IF v_estimated_budget IS NOT NULL AND v_estimated_budget > 0 THEN
        NEW.variance_from_estimate_pct := ROUND(
            ((NEW.total_quoted_amount - v_estimated_budget) / v_estimated_budget) * 100.0, 
            2
        );
    END IF;

    -- Calculate composite score (QCBS: Technical 70% + Financial 30% inverted weight)
    IF NEW.scorecard_technical_compliance > 0 THEN
        NEW.composite_score := ROUND(
            (NEW.scorecard_technical_compliance * 0.40) +
            (NEW.scorecard_safety_record * 0.20) +
            (NEW.scorecard_financial_standing * 0.20) +
            (NEW.scorecard_plant_machinery * 0.20),
            2
        );
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_bids_variance ON vendor_bids;
CREATE TRIGGER trg_vendor_bids_variance
BEFORE INSERT OR UPDATE ON vendor_bids
FOR EACH ROW
EXECUTE FUNCTION trg_calculate_bid_variances();

-- 7. Automated Trigger Function for bid_item_rates
CREATE OR REPLACE FUNCTION trg_calculate_bid_item_rates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.baseline_total_amount_inr := ROUND(NEW.quantity * NEW.baseline_dsr_rate_inr, 2);
    NEW.vendor_total_amount_inr := ROUND(NEW.quantity * NEW.vendor_quoted_rate_inr, 2);
    
    IF NEW.baseline_dsr_rate_inr > 0 THEN
        NEW.rate_variance_pct := ROUND(
            ((NEW.vendor_quoted_rate_inr - NEW.baseline_dsr_rate_inr) / NEW.baseline_dsr_rate_inr) * 100.0, 
            2
        );
    END IF;

    -- Risk classification
    IF NEW.rate_variance_pct > 25.0 THEN
        NEW.risk_flag := 'ABNORMALLY_HIGH';
    ELSIF NEW.rate_variance_pct < -20.0 THEN
        NEW.risk_flag := 'ABNORMALLY_LOW';
    ELSIF NEW.subhead IN ('01 Earthwork', '02 PCC') AND NEW.rate_variance_pct > 15.0 THEN
        NEW.risk_flag := 'FRONT_LOADED';
    ELSE
        NEW.risk_flag := 'COMPETITIVE';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bid_item_rates_calc ON bid_item_rates;
CREATE TRIGGER trg_bid_item_rates_calc
BEFORE INSERT OR UPDATE ON bid_item_rates
FOR EACH ROW
EXECUTE FUNCTION trg_calculate_bid_item_rates();

-- 8. Row Level Security (RLS)
ALTER TABLE tender_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_item_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for all authenticated/anon on tender_packages" ON tender_packages;
CREATE POLICY "Allow select for all authenticated/anon on tender_packages" ON tender_packages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify for all authenticated/anon on tender_packages" ON tender_packages;
CREATE POLICY "Allow modify for all authenticated/anon on tender_packages" ON tender_packages
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for all authenticated/anon on vendor_bids" ON vendor_bids;
CREATE POLICY "Allow select for all authenticated/anon on vendor_bids" ON vendor_bids
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify for all authenticated/anon on vendor_bids" ON vendor_bids;
CREATE POLICY "Allow modify for all authenticated/anon on vendor_bids" ON vendor_bids
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for all authenticated/anon on bid_item_rates" ON bid_item_rates;
CREATE POLICY "Allow select for all authenticated/anon on bid_item_rates" ON bid_item_rates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify for all authenticated/anon on bid_item_rates" ON bid_item_rates;
CREATE POLICY "Allow modify for all authenticated/anon on bid_item_rates" ON bid_item_rates
    FOR ALL USING (true) WITH CHECK (true);

-- 9. Supabase Realtime Publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tender_packages;
        ALTER PUBLICATION supabase_realtime ADD TABLE vendor_bids;
        ALTER PUBLICATION supabase_realtime ADD TABLE bid_item_rates;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 10. Seed Realistic Dataset for PRJ-LKO-TOWER-A
DO $$
DECLARE
    v_pkg_id UUID;
    v_bid_lt_id UUID;
    v_bid_sp_id UUID;
    v_bid_ahl_id UUID;
    v_bid_ncc_id UUID;
BEGIN
    -- Clean existing demo package if re-running
    DELETE FROM tender_packages WHERE package_code = 'PKG-LKO-STR-01';

    -- Insert Package
    INSERT INTO tender_packages (
        project_id,
        package_code,
        package_title,
        scope_of_work,
        trade_discipline,
        estimated_budget_inr,
        emd_amount_inr,
        tender_document_fee_inr,
        tender_validity_days,
        published_date,
        submission_deadline,
        technical_bid_opening_date,
        financial_bid_opening_date,
        procurement_mode,
        status,
        minimum_technical_score,
        evaluation_criteria,
        awarded_vendor_id,
        awarded_contract_value_inr,
        loi_issued_at
    ) VALUES (
        'PRJ-LKO-TOWER-A',
        'PKG-LKO-STR-01',
        'Tower A Structural RCC, Superstructure & Core Works',
        'Construction of 2B+G+18 Upper Floors RCC Framed Superstructure, Shear Walls, Post-Tensioned Slabs, Retaining Basements, and High-Grade Fe500D Reinforcement according to IS 456 & CPWD Specifications 2019.',
        'Civil, Structural & Core Concrete',
        184250000.00,  -- ₹18.425 Crore Engineer's Estimate
        3685000.00,    -- 2% EMD (₹36.85 Lakhs)
        25000.00,
        90,
        now() - interval '25 days',
        now() - interval '5 days',
        now() - interval '4 days',
        now() - interval '2 days',
        'OPEN_E_TENDER',
        'UNDER_EVALUATION',
        70.00,
        'CPWD Two-Envelope System: QCBS Technical Qualification (min. 70/100) followed by Pure Financial L1 Commercial Selection',
        NULL,
        NULL,
        NULL
    ) RETURNING id INTO v_pkg_id;

    -- Insert Vendor Bid 1: Larsen & Toubro Construction (L1 Lowest Responsive)
    INSERT INTO vendor_bids (
        tender_package_id,
        vendor_id,
        vendor_name,
        vendor_reg_number,
        gstin,
        contact_person,
        contact_email,
        contact_phone,
        bid_submission_time,
        emd_paid,
        emd_bank_ref,
        technical_score,
        technical_status,
        total_quoted_amount,
        financial_rank,
        financial_status,
        proposed_duration_months,
        is_recommended,
        scorecard_technical_compliance,
        scorecard_safety_record,
        scorecard_financial_standing,
        scorecard_plant_machinery,
        committee_remarks
    ) VALUES (
        v_pkg_id,
        'VND-LT-01',
        'Larsen & Toubro Ltd (Buildings & Factories IC)',
        'CPWD/CLASS-SUPER/2021/489',
        '07AAACL0149H1ZM',
        'Er. Sanjeev Khurana',
        'skhurana@lntecc.com',
        '+91 98112 34567',
        now() - interval '6 days 4 hours',
        true,
        'BG-SBI-NDLS-2026-99014',
        94.50,
        'TECHNICAL_QUALIFIED',
        175406000.00, -- ₹17.5406 Cr (-4.80% below estimate -> L1)
        'L1',
        'L1_RECOMMENDED',
        16.0,
        true,
        96.00,
        95.00,
        98.00,
        92.00,
        'Substantially responsive L1 bidder. Excellent plant deployment (2 tower cranes on site ready). Rate deviation of -4.80% is justified and within CPWD permissible variation limits.'
    ) RETURNING id INTO v_bid_lt_id;

    -- Insert Vendor Bid 2: Shapoorji Pallonji & Co (L2)
    INSERT INTO vendor_bids (
        tender_package_id,
        vendor_id,
        vendor_name,
        vendor_reg_number,
        gstin,
        contact_person,
        contact_email,
        contact_phone,
        bid_submission_time,
        emd_paid,
        emd_bank_ref,
        technical_score,
        technical_status,
        total_quoted_amount,
        financial_rank,
        financial_status,
        proposed_duration_months,
        is_recommended,
        scorecard_technical_compliance,
        scorecard_safety_record,
        scorecard_financial_standing,
        scorecard_plant_machinery,
        committee_remarks
    ) VALUES (
        v_pkg_id,
        'VND-SP-02',
        'Shapoorji Pallonji and Company Pvt Ltd',
        'CPWD/CLASS-SUPER/2019/205',
        '27AAACS1845G1ZP',
        'Dharmendra Chauhan',
        'dchauhan@shapoorji.com',
        '+91 98201 88765',
        now() - interval '5 days 18 hours',
        true,
        'BG-HDFC-MUM-2026-44321',
        91.00,
        'TECHNICAL_QUALIFIED',
        179828000.00, -- ₹17.9828 Cr (-2.40% below estimate -> L2)
        'L2',
        'L2_STANDBY',
        17.0,
        false,
        92.00,
        90.00,
        94.00,
        88.00,
        'Technically responsive L2 bidder. Quoted ₹44.22 Lakhs above L1. Financial and machinery profile satisfactory.'
    ) RETURNING id INTO v_bid_sp_id;

    -- Insert Vendor Bid 3: Ahluwalia Contracts (India) Ltd (L3)
    INSERT INTO vendor_bids (
        tender_package_id,
        vendor_id,
        vendor_name,
        vendor_reg_number,
        gstin,
        contact_person,
        contact_email,
        contact_phone,
        bid_submission_time,
        emd_paid,
        emd_bank_ref,
        technical_score,
        technical_status,
        total_quoted_amount,
        financial_rank,
        financial_status,
        proposed_duration_months,
        is_recommended,
        scorecard_technical_compliance,
        scorecard_safety_record,
        scorecard_financial_standing,
        scorecard_plant_machinery,
        committee_remarks
    ) VALUES (
        v_pkg_id,
        'VND-AHL-03',
        'Ahluwalia Contracts (India) Limited',
        'CPWD/CLASS-1A/2020/712',
        '07AAACA2155F1Z2',
        'Rohit Ahluwalia',
        'tenders@acilnet.com',
        '+91 98100 23412',
        now() - interval '5 days 10 hours',
        true,
        'BG-PNB-DEL-2026-78119',
        87.50,
        'TECHNICAL_QUALIFIED',
        188487750.00, -- ₹18.8487 Cr (+2.30% above estimate -> L3)
        'L3',
        'NON_RESPONSIVE',
        18.0,
        false,
        88.00,
        86.00,
        89.00,
        86.00,
        'L3 bidder (+2.30% above estimate). Higher quotes on high-tensile steel rebar and shuttering.'
    ) RETURNING id INTO v_bid_ahl_id;

    -- Insert Vendor Bid 4: NCC Limited (L4)
    INSERT INTO vendor_bids (
        tender_package_id,
        vendor_id,
        vendor_name,
        vendor_reg_number,
        gstin,
        contact_person,
        contact_email,
        contact_phone,
        bid_submission_time,
        emd_paid,
        emd_bank_ref,
        technical_score,
        technical_status,
        total_quoted_amount,
        financial_rank,
        financial_status,
        proposed_duration_months,
        is_recommended,
        scorecard_technical_compliance,
        scorecard_safety_record,
        scorecard_financial_standing,
        scorecard_plant_machinery,
        committee_remarks
    ) VALUES (
        v_pkg_id,
        'VND-NCC-04',
        'NCC Limited (Infrastructure & Buildings)',
        'CPWD/CLASS-SUPER/2022/103',
        '36AABCN0123M1Z8',
        'K. V. Subrahmanyam',
        'kvsubramanyam@nccltd.in',
        '+91 94400 55123',
        now() - interval '5 days 2 hours',
        true,
        'BG-ICICI-HYD-2026-66102',
        82.00,
        'TECHNICAL_QUALIFIED',
        193462500.00, -- ₹19.3462 Cr (+5.00% above estimate -> L4)
        'L4',
        'NON_RESPONSIVE',
        18.0,
        false,
        84.00,
        82.00,
        85.00,
        78.00,
        'L4 bidder (+5.00% above estimate). Highest financial quote across all concrete and finishing line items.'
    ) RETURNING id INTO v_bid_ncc_id;

    -- Insert Comparative Statement Line Items for L&T (L1)
    INSERT INTO bid_item_rates (vendor_bid_id, tender_package_id, item_code, item_description, subhead, unit, quantity, baseline_dsr_rate_inr, baseline_total_amount_inr, vendor_quoted_rate_inr, vendor_total_amount_inr, rate_variance_pct, is_lowest_item_rate) VALUES
    (v_bid_lt_id, v_pkg_id, '02.08.01', 'Bulk earthwork excavation in foundation trenches and basements up to 6m depth with lead up to 50m', '01 Earthwork', 'cum', 14500.000, 245.00, 3552500.00, 230.00, 3335000.00, -6.12, true),
    (v_bid_lt_id, v_pkg_id, '04.01.03', 'Providing and laying Plain Cement Concrete (PCC 1:4:8) under foundation base and retaining toe', '02 PCC', 'cum', 1250.000, 4850.00, 6062500.00, 4650.00, 5812500.00, -4.12, true),
    (v_bid_lt_id, v_pkg_id, '05.01.02', 'Reinforced Cement Concrete M30 grade in columns, shear walls, and core lift shafts', '03 RCC', 'cum', 4850.000, 7650.00, 37102500.00, 7250.00, 35162500.00, -5.23, true),
    (v_bid_lt_id, v_pkg_id, '05.02.01', 'Reinforced Cement Concrete M30 grade in suspended floor slabs, beams, and cantilever balconies', '03 RCC', 'cum', 6200.000, 7420.00, 46004000.00, 7100.00, 44020000.00, -4.31, true),
    (v_bid_lt_id, v_pkg_id, '05.09.04', 'Centering and shuttering including strutting, propping up to 4.5m height using film-faced plywood', '03 RCC', 'sqm', 32000.000, 540.00, 17280000.00, 510.00, 16320000.00, -5.56, true),
    (v_bid_lt_id, v_pkg_id, '05.22.06', 'Thermo-Mechanically Treated (TMT) Fe500D bars for reinforcement in RCC works', '05 Steel', 'kg', 785000.000, 72.50, 56912500.00, 69.20, 54322000.00, -4.55, true),
    (v_bid_lt_id, v_pkg_id, '06.01.02', 'Fly ash brick masonry with well-burnt bricks in cement mortar 1:6 in superstructure above plinth', '04 Brickwork', 'cum', 1950.000, 4820.00, 9399000.00, 4620.00, 9009000.00, -4.15, true),
    (v_bid_lt_id, v_pkg_id, '12.11.01', '12mm cement plaster 1:4 with floating coat of neat cement on internal and external faces', '08 Finishes', 'sqm', 28500.000, 278.50, 7937250.00, 260.00, 7410000.00, -6.64, true);

    -- Insert Comparative Statement Line Items for Shapoorji Pallonji (L2)
    INSERT INTO bid_item_rates (vendor_bid_id, tender_package_id, item_code, item_description, subhead, unit, quantity, baseline_dsr_rate_inr, baseline_total_amount_inr, vendor_quoted_rate_inr, vendor_total_amount_inr, rate_variance_pct, is_lowest_item_rate) VALUES
    (v_bid_sp_id, v_pkg_id, '02.08.01', 'Bulk earthwork excavation in foundation trenches and basements up to 6m depth with lead up to 50m', '01 Earthwork', 'cum', 14500.000, 245.00, 3552500.00, 238.00, 3451000.00, -2.86, false),
    (v_bid_sp_id, v_pkg_id, '04.01.03', 'Providing and laying Plain Cement Concrete (PCC 1:4:8) under foundation base and retaining toe', '02 PCC', 'cum', 1250.000, 4850.00, 6062500.00, 4740.00, 5925000.00, -2.27, false),
    (v_bid_sp_id, v_pkg_id, '05.01.02', 'Reinforced Cement Concrete M30 grade in columns, shear walls, and core lift shafts', '03 RCC', 'cum', 4850.000, 7650.00, 37102500.00, 7480.00, 36278000.00, -2.22, false),
    (v_bid_sp_id, v_pkg_id, '05.02.01', 'Reinforced Cement Concrete M30 grade in suspended floor slabs, beams, and cantilever balconies', '03 RCC', 'cum', 6200.000, 7420.00, 46004000.00, 7260.00, 45012000.00, -2.16, false),
    (v_bid_sp_id, v_pkg_id, '05.09.04', 'Centering and shuttering including strutting, propping up to 4.5m height using film-faced plywood', '03 RCC', 'sqm', 32000.000, 540.00, 17280000.00, 528.00, 16896000.00, -2.22, false),
    (v_bid_sp_id, v_pkg_id, '05.22.06', 'Thermo-Mechanically Treated (TMT) Fe500D bars for reinforcement in RCC works', '05 Steel', 'kg', 785000.000, 72.50, 56912500.00, 70.80, 55578000.00, -2.34, false),
    (v_bid_sp_id, v_pkg_id, '06.01.02', 'Fly ash brick masonry with well-burnt bricks in cement mortar 1:6 in superstructure above plinth', '04 Brickwork', 'cum', 1950.000, 4820.00, 9399000.00, 4710.00, 9184500.00, -2.28, false),
    (v_bid_sp_id, v_pkg_id, '12.11.01', '12mm cement plaster 1:4 with floating coat of neat cement on internal and external faces', '08 Finishes', 'sqm', 28500.000, 278.50, 7937250.00, 269.00, 7666500.00, -3.41, false);

    -- Insert Comparative Statement Line Items for Ahluwalia Contracts (L3)
    INSERT INTO bid_item_rates (vendor_bid_id, tender_package_id, item_code, item_description, subhead, unit, quantity, baseline_dsr_rate_inr, baseline_total_amount_inr, vendor_quoted_rate_inr, vendor_total_amount_inr, rate_variance_pct, is_lowest_item_rate) VALUES
    (v_bid_ahl_id, v_pkg_id, '02.08.01', 'Bulk earthwork excavation in foundation trenches and basements up to 6m depth with lead up to 50m', '01 Earthwork', 'cum', 14500.000, 245.00, 3552500.00, 252.00, 3654000.00, 2.86, false),
    (v_bid_ahl_id, v_pkg_id, '04.01.03', 'Providing and laying Plain Cement Concrete (PCC 1:4:8) under foundation base and retaining toe', '02 PCC', 'cum', 1250.000, 4850.00, 6062500.00, 4980.00, 6225000.00, 2.68, false),
    (v_bid_ahl_id, v_pkg_id, '05.01.02', 'Reinforced Cement Concrete M30 grade in columns, shear walls, and core lift shafts', '03 RCC', 'cum', 4850.000, 7650.00, 37102500.00, 7820.00, 37927000.00, 2.22, false),
    (v_bid_ahl_id, v_pkg_id, '05.02.01', 'Reinforced Cement Concrete M30 grade in suspended floor slabs, beams, and cantilever balconies', '03 RCC', 'cum', 6200.000, 7420.00, 46004000.00, 7590.00, 47058000.00, 2.29, false),
    (v_bid_ahl_id, v_pkg_id, '05.09.04', 'Centering and shuttering including strutting, propping up to 4.5m height using film-faced plywood', '03 RCC', 'sqm', 32000.000, 540.00, 17280000.00, 555.00, 17760000.00, 2.78, false),
    (v_bid_ahl_id, v_pkg_id, '05.22.06', 'Thermo-Mechanically Treated (TMT) Fe500D bars for reinforcement in RCC works', '05 Steel', 'kg', 785000.000, 72.50, 56912500.00, 74.10, 58168500.00, 2.21, false),
    (v_bid_ahl_id, v_pkg_id, '06.01.02', 'Fly ash brick masonry with well-burnt bricks in cement mortar 1:6 in superstructure above plinth', '04 Brickwork', 'cum', 1950.000, 4820.00, 9399000.00, 4940.00, 9633000.00, 2.49, false),
    (v_bid_ahl_id, v_pkg_id, '12.11.01', '12mm cement plaster 1:4 with floating coat of neat cement on internal and external faces', '08 Finishes', 'sqm', 28500.000, 278.50, 7937250.00, 283.00, 8065500.00, 1.62, false);

    -- Insert Comparative Statement Line Items for NCC Limited (L4)
    INSERT INTO bid_item_rates (vendor_bid_id, tender_package_id, item_code, item_description, subhead, unit, quantity, baseline_dsr_rate_inr, baseline_total_amount_inr, vendor_quoted_rate_inr, vendor_total_amount_inr, rate_variance_pct, is_lowest_item_rate) VALUES
    (v_bid_ncc_id, v_pkg_id, '02.08.01', 'Bulk earthwork excavation in foundation trenches and basements up to 6m depth with lead up to 50m', '01 Earthwork', 'cum', 14500.000, 245.00, 3552500.00, 260.00, 3770000.00, 6.12, false),
    (v_bid_ncc_id, v_pkg_id, '04.01.03', 'Providing and laying Plain Cement Concrete (PCC 1:4:8) under foundation base and retaining toe', '02 PCC', 'cum', 1250.000, 4850.00, 6062500.00, 5100.00, 6375000.00, 5.15, false),
    (v_bid_ncc_id, v_pkg_id, '05.01.02', 'Reinforced Cement Concrete M30 grade in columns, shear walls, and core lift shafts', '03 RCC', 'cum', 4850.000, 7650.00, 37102500.00, 8050.00, 39042500.00, 5.23, false),
    (v_bid_ncc_id, v_pkg_id, '05.02.01', 'Reinforced Cement Concrete M30 grade in suspended floor slabs, beams, and cantilever balconies', '03 RCC', 'cum', 6200.000, 7420.00, 46004000.00, 7810.00, 48422000.00, 5.26, false),
    (v_bid_ncc_id, v_pkg_id, '05.09.04', 'Centering and shuttering including strutting, propping up to 4.5m height using film-faced plywood', '03 RCC', 'sqm', 32000.000, 540.00, 17280000.00, 570.00, 18240000.00, 5.56, false),
    (v_bid_ncc_id, v_pkg_id, '05.22.06', 'Thermo-Mechanically Treated (TMT) Fe500D bars for reinforcement in RCC works', '05 Steel', 'kg', 785000.000, 72.50, 56912500.00, 75.80, 59503000.00, 4.55, false),
    (v_bid_ncc_id, v_pkg_id, '06.01.02', 'Fly ash brick masonry with well-burnt bricks in cement mortar 1:6 in superstructure above plinth', '04 Brickwork', 'cum', 1950.000, 4820.00, 9399000.00, 5080.00, 9906000.00, 5.39, false),
    (v_bid_ncc_id, v_pkg_id, '12.11.01', '12mm cement plaster 1:4 with floating coat of neat cement on internal and external faces', '08 Finishes', 'sqm', 28500.000, 278.50, 7937250.00, 288.00, 8208000.00, 3.41, false);

END $$;
