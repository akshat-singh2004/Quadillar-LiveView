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
