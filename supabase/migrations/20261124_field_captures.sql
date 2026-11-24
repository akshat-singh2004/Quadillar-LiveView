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
