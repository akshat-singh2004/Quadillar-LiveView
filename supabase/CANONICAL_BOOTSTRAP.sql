-- Quadillar LiveView Canonical Production Tables (Sprints 5-10)
-- Safe to re-run (idempotent) in Supabase SQL Editor on any new environment

-- >>> SOURCE: supabase/migrations/20261124_field_captures.sql
-- Paste into Supabase SQL Editor to persist Sprint 5 field captures permanently
create table if not exists public.field_evidence_packets (
  id text primary key,
  project_id text not null default 'VANGUARD-LKO-01',
  zone_id text not null,
  bim_global_id text not null,
  sha256 text not null unique,
  recorded_at_utc timestamptz not null,
  qr_payload text,
  note_text text not null,
  voice_duration_sec integer not null default 0,
  lat double precision,
  lon double precision,
  gps_accuracy_m integer,
  yaw_deg double precision,
  pitch_deg double precision,
  roll_deg double precision,
  plumb_deviation_deg double precision,
  plumb_pass boolean,
  weather_wind_ms double precision,
  surface_pressure_hpa double precision,
  bandwidth_profile text not null default 'standard',
  media_uploaded boolean not null default false,
  thumb_data_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_field_evidence_zone on public.field_evidence_packets (zone_id, bim_global_id);

-- >>> SOURCE: supabase/migrations/20261124_governor_snapshots.sql
-- Paste into Supabase SQL Editor to sync Molecular Governor state across phone & PC in real time
create table if not exists public.governor_snapshots (
  project_id text primary key,
  mode text not null default 'stress-test',
  revision bigint not null default 0,
  input_payload jsonb not null,
  row_hash text not null,
  http_status integer not null default 422,
  frozen_inr bigint not null default 0,
  net_release_inr bigint not null default 0,
  violation_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- >>> SOURCE: supabase/migrations/20261124_notification_preferences.sql
-- Paste into Supabase SQL Editor to persist user notification channel settings
create table if not exists public.notification_preferences (
  user_key text primary key,
  sms_enabled boolean not null default false,
  sms_phone text not null default '',
  whatsapp_enabled boolean not null default false,
  whatsapp_phone text not null default '',
  email_enabled boolean not null default true,
  email_address text not null default '',
  device_push_enabled boolean not null default false,
  min_severity text not null default 'HIGH',
  quiet_hours_enabled boolean not null default false,
  quiet_start text not null default '22:00',
  quiet_end text not null default '07:00',
  bypass_quiet_for_critical boolean not null default true,
  triggers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);


-- >>> SOURCE: supabase/migrations/20261126_governor_events.sql
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

-- >>> SOURCE: supabase/migrations/20261126_field_evidence_storage.sql
-- Sprint 13B: Content-Addressed Binary Evidence Vault (Supabase Storage + Metadata Columns)

-- 1. Provision public read / append-only upload bucket for site captures (5 MB cap, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-evidence',
  'field-evidence',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Object RLS Policies (append-only: SELECT + INSERT; UPDATE/DELETE omitted)
DROP POLICY IF EXISTS "field_evidence_public_read" ON storage.objects;
CREATE POLICY "field_evidence_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'field-evidence');

DROP POLICY IF EXISTS "field_evidence_append_insert" ON storage.objects;
CREATE POLICY "field_evidence_append_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'field-evidence');

-- 3. Add optional binary vault metadata columns to field_evidence_packets
ALTER TABLE IF EXISTS public.field_evidence_packets
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_object_path TEXT,
  ADD COLUMN IF NOT EXISTS media_bytes INTEGER;

NOTIFY pgrst, 'reload schema';
