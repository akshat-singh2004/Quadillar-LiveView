-- Sprint 12A: Append-Only Cryptographically Hash-Chained Event Ledger (BSA Section 63)
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
