-- Sprint 12A + 13A: Append-Only Cryptographically Hash-Chained Event Ledger (BSA Section 63)
CREATE TABLE IF NOT EXISTS public.governor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  source TEXT NOT NULL DEFAULT 'api',
  mode TEXT NOT NULL DEFAULT 'custom',
  http_status INTEGER NOT NULL,
  frozen_inr NUMERIC NOT NULL DEFAULT 0,
  net_release_inr NUMERIC NOT NULL DEFAULT 0,
  violation_count INTEGER NOT NULL DEFAULT 0,
  diff_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL,
  recorded_at_utc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT governor_events_project_seq_unique UNIQUE (project_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_governor_events_project_seq
  ON public.governor_events (project_id, seq DESC);

CREATE INDEX IF NOT EXISTS idx_governor_events_chain_hash
  ON public.governor_events (chain_hash);

-- Append-only RLS + Grants (SELECT and INSERT only; UPDATE/DELETE revoked)
ALTER TABLE public.governor_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "governor_events_append_only_select" ON public.governor_events;
CREATE POLICY "governor_events_append_only_select"
  ON public.governor_events FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "governor_events_append_only_insert" ON public.governor_events;
CREATE POLICY "governor_events_append_only_insert"
  ON public.governor_events FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON TABLE public.governor_events TO anon, authenticated, service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.governor_events FROM anon, authenticated;

-- Database-Engine Immutability Trigger (blocks even direct SQL UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.prevent_governor_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'BSA Section 63 Violation: public.governor_events is cryptographically append-only (% blocked)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_governor_events_immutable ON public.governor_events;
CREATE TRIGGER trg_governor_events_immutable
  BEFORE UPDATE OR DELETE ON public.governor_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_governor_events_mutation();

NOTIFY pgrst, 'reload schema';
