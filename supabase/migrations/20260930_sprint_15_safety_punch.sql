-- Canonical Safety PTW Register
CREATE TABLE IF NOT EXISTS public.safety_ptw_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    permit_number TEXT NOT NULL,
    permit_category TEXT NOT NULL,
    hazard_classification TEXT DEFAULT 'Height',
    location_zone TEXT NOT NULL,
    subcontractor_name TEXT NOT NULL,
    valid_from_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until_time TIMESTAMPTZ NOT NULL,
    safety_officer_cleared BOOLEAN DEFAULT FALSE,
    engineer_cleared BOOLEAN DEFAULT FALSE,
    wind_speed_kmh NUMERIC(5,2) DEFAULT 0.0,
    oxygen_level_pct NUMERIC(4,2) DEFAULT 20.9,
    checklist_json JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING_CLEARANCE',
    sha256_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canonical Punch List & Defect Registry
CREATE TABLE IF NOT EXISTS public.punch_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    ticket_id TEXT NOT NULL,
    location_room TEXT NOT NULL,
    trade_discipline TEXT NOT NULL,
    defect_description TEXT NOT NULL,
    severity_tier TEXT NOT NULL CHECK (severity_tier IN ('CATEGORY_A', 'CATEGORY_B', 'CATEGORY_C')),
    evidence_status TEXT DEFAULT 'PENDING_INSPECTION',
    subcontractor_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RECTIFIED', 'CLOSED')),
    reported_by TEXT NOT NULL,
    target_rectification_date DATE,
    closure_date DATE,
    ifc_guid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility views for legacy route references
CREATE OR REPLACE VIEW public.safety_permits_ptw AS 
SELECT 
    id,
    project_id,
    permit_number,
    permit_category AS permit_type,
    location_zone AS work_location,
    subcontractor_name AS contractor_name,
    'Chief Safety Officer (HSE)' AS safety_officer_name,
    valid_from_time AS valid_from,
    valid_until_time AS valid_until,
    wind_speed_kmh,
    oxygen_level_pct,
    status,
    (safety_officer_cleared AND engineer_cleared) AS safety_measures_verified,
    created_at
FROM public.safety_ptw_register;

CREATE OR REPLACE VIEW public.field_punch_list_items AS
SELECT 
    id,
    project_id,
    ticket_id AS item_code,
    location_room AS location_grid,
    trade_discipline AS trade_package,
    subcontractor_name AS contractor_name,
    defect_description,
    CASE 
        WHEN severity_tier = 'CATEGORY_A' THEN 'CRITICAL'
        WHEN severity_tier = 'CATEGORY_B' THEN 'MAJOR'
        ELSE 'MINOR'
    END AS severity,
    CASE 
        WHEN status = 'OPEN' THEN 'OPEN_PENDING'
        WHEN status = 'RECTIFIED' THEN 'RECTIFIED_AWAITING_QC'
        ELSE 'CLOSED_VERIFIED'
    END AS status,
    target_rectification_date,
    created_at
FROM public.punch_list_items;

CREATE INDEX IF NOT EXISTS idx_safety_ptw_proj ON public.safety_ptw_register(project_id, status);
CREATE INDEX IF NOT EXISTS idx_punch_items_proj ON public.punch_list_items(project_id, severity_tier, status);
