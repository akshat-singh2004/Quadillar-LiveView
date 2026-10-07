-- ====================================================================================
-- Quadillar LiveView: Material Inventory, Store Accounting & GRS Ledger
-- Standards: CPWD Works Accounts Code Chapter 7 (Stores & Stock Accounts)
--           CPWD Form 8 (Bin Card) & Form 8-A (Goods Received Sheet)
--           FIDIC Red Book Clause 14.5 (Plant and Materials Intended for Works)
-- ====================================================================================

-- 1. Create Domain Enums (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'store_material_category') THEN
        CREATE TYPE store_material_category AS ENUM (
            'CEMENT', 
            'STEEL_REBAR', 
            'AGGREGATES', 
            'MASONRY', 
            'CHEMICALS', 
            'FINISHING', 
            'SHUTTERING', 
            'CONSUMABLES'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_stock_status') THEN
        CREATE TYPE inventory_stock_status AS ENUM (
            'OPTIMAL', 
            'LOW_STOCK', 
            'CRITICAL_REORDER', 
            'OVERSTOCKED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grs_verification_status') THEN
        CREATE TYPE grs_verification_status AS ENUM (
            'VERIFIED_ACCEPTED', 
            'CONDITIONALLY_ACCEPTED', 
            'REJECTED_RETURNED', 
            'UNDER_TESTING'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bin_card_transaction_type') THEN
        CREATE TYPE bin_card_transaction_type AS ENUM (
            'RECEIPT', 
            'ISSUE_TO_SITE', 
            'RETURN_FROM_SITE', 
            'AUDIT_ADJUSTMENT', 
            'SCRAP_WRITEOFF'
        );
    END IF;
END $$;

-- 2. Create Table: store_inventory
CREATE TABLE IF NOT EXISTS store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    subhead_code TEXT,
    unit TEXT NOT NULL,
    bin_location TEXT NOT NULL,
    current_stock_balance NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    minimum_stock_threshold NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reorder_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    standard_issue_rate_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_received_date TIMESTAMPTZ,
    last_issued_date TIMESTAMPTZ,
    valuation_total_inr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    inventory_status TEXT NOT NULL DEFAULT 'OPTIMAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Table: goods_received_sheets (CPWD Form 8-A Equivalent)
CREATE TABLE IF NOT EXISTS goods_received_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    grs_number TEXT UNIQUE NOT NULL,
    po_reference TEXT NOT NULL,
    challan_number TEXT NOT NULL,
    challan_date DATE NOT NULL,
    received_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    supplier_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    carrier_name TEXT NOT NULL,
    item_code TEXT NOT NULL REFERENCES store_inventory(item_code) ON DELETE RESTRICT,
    item_description TEXT NOT NULL,
    unit TEXT NOT NULL,
    challan_quantity NUMERIC(12, 3) NOT NULL,
    received_quantity NUMERIC(12, 3) NOT NULL,
    accepted_quantity NUMERIC(12, 3) NOT NULL,
    rejected_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    purchase_rate_inr NUMERIC(12, 2) NOT NULL,
    carriage_freight_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    incidental_storage_pct NUMERIC(5, 2) NOT NULL DEFAULT 2.50,
    calculated_issue_rate_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_grs_value_inr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    physical_verification_status TEXT NOT NULL DEFAULT 'VERIFIED_ACCEPTED',
    quality_inspection_ref TEXT,
    quality_conformity BOOLEAN NOT NULL DEFAULT true,
    storekeeper_sign TEXT NOT NULL DEFAULT 'Mohan Lal (Head Storekeeper)',
    sectional_officer_sign TEXT NOT NULL DEFAULT 'Er. S. P. Verma (AE/SO)',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Table: bin_card_entries (CPWD Form 8 Equivalent)
CREATE TABLE IF NOT EXISTS bin_card_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    item_code TEXT NOT NULL REFERENCES store_inventory(item_code) ON DELETE RESTRICT,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_type TEXT NOT NULL,
    reference_voucher_no TEXT NOT NULL,
    issue_to_location_or_trade TEXT,
    contractor_or_indentor TEXT,
    quantity_in NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    quantity_out NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    balance_quantity NUMERIC(12, 3) NOT NULL,
    unit_rate_inr NUMERIC(12, 2) NOT NULL,
    storekeeper_initials TEXT NOT NULL DEFAULT 'ML',
    audit_check_initials TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_proj_cat ON store_inventory(project_id, category);
CREATE INDEX IF NOT EXISTS idx_store_inventory_status ON store_inventory(inventory_status);
CREATE INDEX IF NOT EXISTS idx_grs_proj_date ON goods_received_sheets(project_id, received_date);
CREATE INDEX IF NOT EXISTS idx_grs_item_code ON goods_received_sheets(item_code);
CREATE INDEX IF NOT EXISTS idx_bin_card_item_date ON bin_card_entries(item_code, entry_date);

-- 6. Trigger: Calculate Issue Rate and Total Value on GRS
CREATE OR REPLACE FUNCTION trg_compute_grs_issue_rate()
RETURNS TRIGGER AS $$
DECLARE
    v_freight_per_unit NUMERIC(12, 2) := 0.00;
    v_base_cost_with_freight NUMERIC(12, 2) := 0.00;
BEGIN
    IF NEW.accepted_quantity > 0 THEN
        v_freight_per_unit := ROUND(NEW.carriage_freight_inr / NEW.accepted_quantity, 2);
    END IF;

    v_base_cost_with_freight := NEW.purchase_rate_inr + v_freight_per_unit;

    -- CPWD Para 7.2.1: Add 2.5% incidental storage & supervision charges
    NEW.calculated_issue_rate_inr := ROUND(
        v_base_cost_with_freight + (v_base_cost_with_freight * (NEW.incidental_storage_pct / 100.0)),
        2
    );

    NEW.total_grs_value_inr := ROUND(NEW.accepted_quantity * NEW.calculated_issue_rate_inr, 2);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grs_issue_rate_calc ON goods_received_sheets;
CREATE TRIGGER trg_grs_issue_rate_calc
BEFORE INSERT OR UPDATE ON goods_received_sheets
FOR EACH ROW
EXECUTE FUNCTION trg_compute_grs_issue_rate();

-- 7. Trigger: Update Inventory Valuation and Stock Status
CREATE OR REPLACE FUNCTION trg_update_inventory_status_and_valuation()
RETURNS TRIGGER AS $$
BEGIN
    NEW.valuation_total_inr := ROUND(NEW.current_stock_balance * NEW.standard_issue_rate_inr, 2);

    IF NEW.current_stock_balance <= (NEW.minimum_stock_threshold * 0.5) THEN
        NEW.inventory_status := 'CRITICAL_REORDER';
    ELSIF NEW.current_stock_balance <= NEW.minimum_stock_threshold THEN
        NEW.inventory_status := 'LOW_STOCK';
    ELSIF NEW.current_stock_balance >= (NEW.minimum_stock_threshold * 3.5) THEN
        NEW.inventory_status := 'OVERSTOCKED';
    ELSE
        NEW.inventory_status := 'OPTIMAL';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_inv_valuation ON store_inventory;
CREATE TRIGGER trg_store_inv_valuation
BEFORE INSERT OR UPDATE ON store_inventory
FOR EACH ROW
EXECUTE FUNCTION trg_update_inventory_status_and_valuation();

-- 8. Row Level Security (RLS)
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bin_card_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for all on store_inventory" ON store_inventory;
CREATE POLICY "Allow select for all on store_inventory" ON store_inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify for all on store_inventory" ON store_inventory;
CREATE POLICY "Allow modify for all on store_inventory" ON store_inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for all on goods_received_sheets" ON goods_received_sheets;
CREATE POLICY "Allow select for all on goods_received_sheets" ON goods_received_sheets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify for all on goods_received_sheets" ON goods_received_sheets;
CREATE POLICY "Allow modify for all on goods_received_sheets" ON goods_received_sheets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for all on bin_card_entries" ON bin_card_entries;
CREATE POLICY "Allow select for all on bin_card_entries" ON bin_card_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify for all on bin_card_entries" ON bin_card_entries;
CREATE POLICY "Allow modify for all on bin_card_entries" ON bin_card_entries FOR ALL USING (true) WITH CHECK (true);

-- 9. Realtime Publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE store_inventory;
        ALTER PUBLICATION supabase_realtime ADD TABLE goods_received_sheets;
        ALTER PUBLICATION supabase_realtime ADD TABLE bin_card_entries;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 10. Seed Realistic Store Inventory & GRS Data for PRJ-LKO-TOWER-A
DO $$
BEGIN
    -- Delete existing entries for idempotent re-runs
    DELETE FROM bin_card_entries WHERE project_id = 'PRJ-LKO-TOWER-A';
    DELETE FROM goods_received_sheets WHERE project_id = 'PRJ-LKO-TOWER-A';
    DELETE FROM store_inventory WHERE project_id = 'PRJ-LKO-TOWER-A';

    -- Insert Master Store Inventory Items
    INSERT INTO store_inventory (
        project_id, item_code, item_name, category, subhead_code, unit, bin_location,
        current_stock_balance, minimum_stock_threshold, reorder_quantity, standard_issue_rate_inr,
        last_received_date, last_issued_date, inventory_status
    ) VALUES
    ('PRJ-LKO-TOWER-A', 'MAT-CEM-PPC', 'UltraTech Portland Pozzolana Cement (PPC) 50kg Bags', 'CEMENT', '02.PCC', 'Bags', 'Shed A - Bay 1 to 4', 1850.000, 1200.000, 1500.000, 410.00, now() - interval '2 days', now() - interval '4 hours', 'OPTIMAL'),
    ('PRJ-LKO-TOWER-A', 'MAT-STEEL-16MM', 'Tata Tiscon Fe500D Thermo-Mechanically Treated Rebar 16mm', 'STEEL_REBAR', '05.STEEL', 'MT', 'Rebar Yard - Rack R-16', 38.500, 45.000, 50.000, 67200.00, now() - interval '8 days', now() - interval '1 day', 'LOW_STOCK'),
    ('PRJ-LKO-TOWER-A', 'MAT-STEEL-25MM', 'Tata Tiscon Fe500D Thermo-Mechanically Treated Rebar 25mm', 'STEEL_REBAR', '05.STEEL', 'MT', 'Rebar Yard - Rack R-25', 62.000, 30.000, 40.000, 66500.00, now() - interval '4 days', now() - interval '2 days', 'OPTIMAL'),
    ('PRJ-LKO-TOWER-A', 'MAT-AGG-20MM', 'Blue Metal Crushed Granitic Aggregate 20mm Graded', 'AGGREGATES', '03.RCC', 'cum', 450.000, 300.000, 400.000, 1680.00, now() - interval '1 day', now() - interval '6 hours', 'OPTIMAL'),
    ('PRJ-LKO-TOWER-A', 'MAT-SAND-ZONE2', 'Washed Coarse River Sand (Zone II Grading IS 383)', 'AGGREGATES', '03.RCC', 'cum', 280.000, 350.000, 500.000, 2150.00, now() - interval '6 days', now() - interval '12 hours', 'LOW_STOCK'),
    ('PRJ-LKO-TOWER-A', 'MAT-BRK-FLYA', 'High-Strength Autoclaved Fly Ash Bricks (Class 7.5)', 'MASONRY', '04.BRICKWORK', 'Nos', 'Open Stacking Yard - Block B', 45000.000, 20000.000, 30000.000, 7.85, now() - interval '3 days', now() - interval '1 day', 'OPTIMAL'),
    ('PRJ-LKO-TOWER-A', 'MAT-CHEM-ADMIX', 'Fosroc Conplast SP430 High-Range Superplasticizer', 'CHEMICALS', '03.RCC', 'Litres', 'Chemical Vault C-1', 1200.000, 800.000, 1000.000, 152.00, now() - interval '10 days', now() - interval '2 days', 'OPTIMAL'),
    ('PRJ-LKO-TOWER-A', 'MAT-PLY-12MM', 'Calibrated Film-Faced Shuttering Plywood 12mm (34kg)', 'SHUTTERING', '03.RCC', 'Sheets', 'Shed B - Formwork Stack F-3', 650.000, 500.000, 600.000, 1450.00, now() - interval '5 days', now() - interval '1 day', 'OPTIMAL');

    -- Insert Goods Received Sheets (GRS Form 8-A)
    INSERT INTO goods_received_sheets (
        project_id, grs_number, po_reference, challan_number, challan_date, received_date,
        supplier_id, supplier_name, vehicle_number, carrier_name, item_code, item_description, unit,
        challan_quantity, received_quantity, accepted_quantity, rejected_quantity,
        purchase_rate_inr, carriage_freight_inr, incidental_storage_pct, physical_verification_status,
        quality_inspection_ref, quality_conformity, storekeeper_sign, sectional_officer_sign, remarks
    ) VALUES
    (
        'PRJ-LKO-TOWER-A', 'GRS/2026/09/001', 'PO-LKO-2026-441', 'CHL-UT-9901', current_date - 2, now() - interval '2 days',
        'VND-UT-CEM', 'UltraTech Cement Limited (Dalla Works)', 'UP-32-DN-4821', 'Trans-Awadh Logistics',
        'MAT-CEM-PPC', 'UltraTech PPC Cement 50kg Bags in moisture-proof HDPE packaging', 'Bags',
        600.000, 600.000, 600.000, 0.000,
        385.00, 9000.00, 2.50, 'VERIFIED_ACCEPTED',
        'MTC-UT-AUG26-4108', true, 'Mohan Lal (Head Storekeeper)', 'Er. S. P. Verma (AE/SO)',
        'Physical count tally verified. Zero burst bags. Manufacturer test certificate matches 28-day target strength.'
    ),
    (
        'PRJ-LKO-TOWER-A', 'GRS/2026/09/002', 'PO-LKO-2026-445', 'CHL-TATA-7812', current_date - 4, now() - interval '4 days',
        'VND-TATA-STL', 'Tata Steel Limited (Jamshedpur Works)', 'NL-01-AB-9811', 'Northern Carrier Corp',
        'MAT-STEEL-25MM', 'Tata Tiscon Fe500D High Tensile Rebar 25mm 12m length', 'MT',
        30.000, 30.120, 30.000, 0.120,
        63500.00, 42000.00, 2.50, 'VERIFIED_ACCEPTED',
        'MTC-TATA-2026-99120', true, 'Mohan Lal (Head Storekeeper)', 'Er. S. P. Verma (AE/SO)',
        'Weighbridge slip WB-8819 verified (Gross 46.22 MT, Tare 16.10 MT). 0.120 MT rolling margin variance adjusted.'
    ),
    (
        'PRJ-LKO-TOWER-A', 'GRS/2026/09/003', 'PO-LKO-2026-450', 'CHL-AGG-4102', current_date - 1, now() - interval '1 day',
        'VND-MOHAN-CRUSH', 'Mohan Stone Crushers & Minerals', 'UP-78-BT-1120', 'Direct Tipper Freight',
        'MAT-AGG-20MM', 'Blue Metal 20mm Crushed Stone Aggregate for M30 Concrete', 'cum',
        80.000, 80.000, 80.000, 0.000,
        1580.00, 4800.00, 2.50, 'VERIFIED_ACCEPTED',
        'SIEVE-TEST-2026-092', true, 'Mohan Lal (Head Storekeeper)', 'Er. S. P. Verma (AE/SO)',
        'Sieve analysis conforms to IS 383 Table 2 grading limits. Flakiness index 12.4% (well within 15% limit).'
    ),
    (
        'PRJ-LKO-TOWER-A', 'GRS/2026/09/004', 'PO-LKO-2026-452', 'CHL-BRK-3381', current_date - 3, now() - interval '3 days',
        'VND-ECO-BRICKS', 'EcoGreen Bricks & Blocks Pvt Ltd', 'UP-32-ET-6677', 'Express Tipper Supply',
        'MAT-BRK-FLYA', 'Autoclaved Fly Ash Bricks 230x110x75mm Grade 7.5', 'Nos',
        10000.000, 10000.000, 9850.000, 150.000,
        7.20, 4500.00, 2.50, 'CONDITIONALLY_ACCEPTED',
        'COMP-BRK-TEST-771', true, 'Mohan Lal (Head Storekeeper)', 'Er. S. P. Verma (AE/SO)',
        '150 Nos found damaged during transit unloading. Debited from vendor invoice; net accepted 9,850 Nos.'
    ),
    (
        'PRJ-LKO-TOWER-A', 'GRS/2026/09/005', 'PO-LKO-2026-438', 'CHL-FOSROC-1102', current_date - 10, now() - interval '10 days',
        'VND-FOSROC-CHM', 'Fosroc Chemicals (India) Pvt Ltd', 'KA-01-MJ-5519', 'SafeChemical Freight Line',
        'MAT-CHEM-ADMIX', 'Fosroc Conplast SP430 in 200L Sealed Barrels', 'Litres',
        600.000, 600.000, 600.000, 0.000,
        142.00, 3600.00, 2.50, 'VERIFIED_ACCEPTED',
        'COA-FOSROC-AUG26', true, 'Mohan Lal (Head Storekeeper)', 'Er. S. P. Verma (AE/SO)',
        '3 Barrels of 200L each received in pristine tamper-evident condition. Specific gravity 1.20 verified.'
    ),
    (
        'PRJ-LKO-TOWER-A', 'GRS/2026/09/006', 'PO-LKO-2026-455', 'CHL-TATA-8004', current_date - 8, now() - interval '8 days',
        'VND-TATA-STL', 'Tata Steel Limited (Jamshedpur Works)', 'NL-01-AB-9811', 'Northern Carrier Corp',
        'MAT-STEEL-16MM', 'Tata Tiscon Fe500D High Tensile Rebar 16mm 12m length', 'MT',
        25.000, 25.000, 25.000, 0.000,
        64200.00, 35000.00, 2.50, 'VERIFIED_ACCEPTED',
        'MTC-TATA-2026-99044', true, 'Mohan Lal (Head Storekeeper)', 'Er. S. P. Verma (AE/SO)',
        'Weighbridge ticket checked. Tensile and bend-rebend tests verified per IS 1786.'
    );

    -- Insert Bin Card Historical Entries (CPWD Form 8)
    INSERT INTO bin_card_entries (
        project_id, item_code, entry_date, transaction_type, reference_voucher_no,
        issue_to_location_or_trade, contractor_or_indentor, quantity_in, quantity_out,
        balance_quantity, unit_rate_inr, storekeeper_initials, remarks
    ) VALUES
    ('PRJ-LKO-TOWER-A', 'MAT-CEM-PPC', now() - interval '5 days', 'RECEIPT', 'GRS/2026/09/000', 'Central Store Shed A', 'Supplier Inward', 1500.000, 0.000, 1500.000, 410.00, 'ML', 'Opening stock consolidation'),
    ('PRJ-LKO-TOWER-A', 'MAT-CEM-PPC', now() - interval '4 days', 'ISSUE_TO_SITE', 'IND/2026/09/101', 'Tower A Level 6 Columns & Core Wall Pour', 'Larsen & Toubro Ltd', 0.000, 250.000, 1250.000, 410.00, 'ML', 'Indented for M30 mix design'),
    ('PRJ-LKO-TOWER-A', 'MAT-CEM-PPC', now() - interval '2 days', 'RECEIPT', 'GRS/2026/09/001', 'Central Store Shed A', 'UltraTech Dalla Works', 600.000, 0.000, 1850.000, 410.00, 'ML', 'Consignment received via CHL-UT-9901'),
    ('PRJ-LKO-TOWER-A', 'MAT-STEEL-16MM', now() - interval '12 days', 'RECEIPT', 'GRS/2026/08/998', 'Rebar Yard Rack R-16', 'Tata Steel Stockist', 50.000, 0.000, 50.000, 67200.00, 'ML', 'Initial project allotment'),
    ('PRJ-LKO-TOWER-A', 'MAT-STEEL-16MM', now() - interval '8 days', 'RECEIPT', 'GRS/2026/09/006', 'Rebar Yard Rack R-16', 'Tata Steel Jamshedpur', 25.000, 0.000, 75.000, 67200.00, 'ML', 'Received under PO-455'),
    ('PRJ-LKO-TOWER-A', 'MAT-STEEL-16MM', now() - interval '3 days', 'ISSUE_TO_SITE', 'IND/2026/09/108', 'Tower A Level 7 Beam Reinforcement', 'Larsen & Toubro Ltd', 0.000, 22.500, 52.500, 67200.00, 'ML', 'Bar bending schedule BBS-L7-02'),
    ('PRJ-LKO-TOWER-A', 'MAT-STEEL-16MM', now() - interval '1 day', 'ISSUE_TO_SITE', 'IND/2026/09/114', 'Tower A Level 8 Slab Mesh & Shear Links', 'Larsen & Toubro Ltd', 0.000, 14.000, 38.500, 67200.00, 'ML', 'Low stock alert triggered (< 45 MT threshold)'),
    ('PRJ-LKO-TOWER-A', 'MAT-SAND-ZONE2', now() - interval '10 days', 'RECEIPT', 'GRS/2026/08/889', 'Aggregate Stockpile Yard', 'Ganga Sand Miners', 400.000, 0.000, 400.000, 2150.00, 'ML', 'Riverbed consignment inward'),
    ('PRJ-LKO-TOWER-A', 'MAT-SAND-ZONE2', now() - interval '6 days', 'ISSUE_TO_SITE', 'IND/2026/09/095', 'Batching Plant M30 Mix', 'In-house Concrete Plant', 0.000, 120.000, 280.000, 2150.00, 'ML', 'Low stock balance (280 cum vs 350 cum threshold)');

END $$;
