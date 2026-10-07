CREATE TABLE IF NOT EXISTS public.contract_claims_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    claim_reference TEXT NOT NULL,
    title TEXT NOT NULL,
    work_order_ref TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    trade_package TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'TIME_EXTENSION_EOT',
    event_occurrence_date DATE NOT NULL,
    claim_notice_date DATE NOT NULL,
    days_to_notice INTEGER NOT NULL DEFAULT 0,
    is_time_barred BOOLEAN NOT NULL DEFAULT FALSE,
    time_extension_claimed_days INTEGER NOT NULL DEFAULT 0,
    financial_quantum_claimed_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    engineer_assessed_eot_days INTEGER NOT NULL DEFAULT 0,
    engineer_assessed_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    liquidated_damages_levied_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    unjustified_delay_weeks NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    linked_hindrance_code TEXT,
    dab_referral_date DATE,
    dab_decision_due_date DATE,
    dab_decision_summary TEXT,
    status TEXT NOT NULL DEFAULT 'NOTICE_SUBMITTED_28D',
    lead_arbiter_name TEXT,
    seor_assessor_name TEXT,
    settled_at TIMESTAMPTZ,
    contemporaneous_evidence_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_proj ON public.contract_claims_disputes(project_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_ref ON public.contract_claims_disputes(claim_reference);
