CREATE TABLE IF NOT EXISTS public.drawing_spatial_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    sheet_no TEXT NOT NULL,
    x_pct NUMERIC(5,2) NOT NULL,
    y_pct NUMERIC(5,2) NOT NULL,
    pin_type TEXT NOT NULL CHECK (pin_type IN ('RFI', 'SNAG', 'QUALITY_GATE')),
    label TEXT NOT NULL,
    description TEXT,
    grid_reference TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cde_drawing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    drawing_number TEXT NOT NULL,
    drawing_code TEXT,
    drawing_title TEXT NOT NULL,
    discipline TEXT NOT NULL DEFAULT 'Architectural',
    revision TEXT NOT NULL DEFAULT 'R1',
    status TEXT NOT NULL DEFAULT 'GFC_PUBLISHED',
    scale TEXT DEFAULT '1:100 @ A1',
    markup_layer_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_pins_proj_sheet ON public.drawing_spatial_pins(project_id, sheet_no);
CREATE INDEX IF NOT EXISTS idx_cde_drawings_proj ON public.cde_drawing_packages(project_id, drawing_number);
