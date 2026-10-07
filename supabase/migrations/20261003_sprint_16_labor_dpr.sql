CREATE TABLE IF NOT EXISTS public.labor_roster_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    trade TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    planned_headcount INTEGER NOT NULL DEFAULT 0,
    actual_headcount INTEGER NOT NULL DEFAULT 0,
    wage_rate_per_day NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    target_output_unit TEXT NOT NULL DEFAULT 'units',
    target_output_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    achieved_output_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    synced_to_dpr BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labor_roster_proj_date ON public.labor_roster_entries(project_id, work_date);
