-- ==============================================================================
-- QUADILLAR LIVEVIEW: DLP GOVERNANCE & TELEMETRY SCHEMA
-- Standards: CPWD GCC Clause 17, IS 1905, IS 732, IS 1346, NBC 2016 Part 8
-- ==============================================================================

-- 1. Statutory DLP Quarterly Inspection Schedule Table
CREATE TABLE IF NOT EXISTS public.dlp_inspection_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
    milestone_code TEXT NOT NULL UNIQUE,
    target_inspection_date DATE NOT NULL,
    scope_description TEXT NOT NULL,
    statutory_basis TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED')),
    inspected_by TEXT,
    inspection_report_url TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for project queries
CREATE INDEX IF NOT EXISTS idx_dlp_schedule_project_id 
    ON public.dlp_inspection_schedule(project_id);

-- 2. DLP Snag & Latent Defect Telemetry Table (CPWD Clause 17)
CREATE TABLE IF NOT EXISTS public.dlp_defect_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_ref TEXT NOT NULL UNIQUE,
    project_id TEXT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
    floor_level TEXT NOT NULL,
    spatial_zone TEXT NOT NULL,
    bim_element_guid UUID,
    trade_category TEXT NOT NULL CHECK (trade_category IN (
        'CIVIL_STRUCTURAL',
        'MASONRY_PLASTER',
        'WATERPROOFING_MEMBRANE',
        'FLOORING_CEILING',
        'MEP_HVAC_AIR_DISTRIBUTION',
        'MEP_ELECTRICAL',
        'MEP_PLUMBING_DRAINAGE',
        'FIRE_LIFE_SAFETY',
        'VERTICAL_TRANSPORTATION'
    )),
    defect_classification TEXT NOT NULL DEFAULT 'LATENT_OBSERVATION' CHECK (defect_classification IN (
        'MINOR_SNAG',
        'LATENT_OBSERVATION',
        'CRITICAL_OPERATIONAL_FAULT',
        'STATUTORY_NON_COMPLIANCE'
    )),
    description TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    notice_issued_to TEXT NOT NULL,
    contractual_clause TEXT NOT NULL DEFAULT 'CPWD GCC Clause 17',
    rectification_sla_days INTEGER NOT NULL DEFAULT 14,
    notice_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sla_breach_deadline TIMESTAMPTZ NOT NULL,
    escrow_corpus_at_risk_inr NUMERIC(15, 2) NOT NULL DEFAULT 2250000.00,
    ticket_status TEXT NOT NULL DEFAULT 'OPEN_CONTRACTOR_ACTION_PENDING' CHECK (ticket_status IN (
        'OPEN_CONTRACTOR_ACTION_PENDING',
        'CONTRACTOR_ACKNOWLEDGED',
        'RECTIFICATION_IN_PROGRESS',
        'RECTIFIED_PENDING_INSPECTION',
        'VERIFIED_AND_CLOSED',
        'SLA_BREACHED_THIRD_PARTY_INVOKED'
    )),
    rectification_evidence_url TEXT,
    rectified_at TIMESTAMPTZ,
    verified_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance & SLA monitoring
CREATE INDEX IF NOT EXISTS idx_dlp_tickets_project_id 
    ON public.dlp_defect_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_dlp_tickets_status 
    ON public.dlp_defect_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS idx_dlp_tickets_sla_deadline 
    ON public.dlp_defect_tickets(sla_breach_deadline);

-- 3. Row Level Security (RLS)
ALTER TABLE public.dlp_inspection_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dlp_defect_tickets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dlp_inspection_schedule' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.dlp_inspection_schedule
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dlp_inspection_schedule' AND policyname = 'Allow service role full access'
    ) THEN
        CREATE POLICY "Allow service role full access" ON public.dlp_inspection_schedule
            FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'anon');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dlp_defect_tickets' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.dlp_defect_tickets
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dlp_defect_tickets' AND policyname = 'Allow service role full access'
    ) THEN
        CREATE POLICY "Allow service role full access" ON public.dlp_defect_tickets
            FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'anon');
    END IF;
END $$;
