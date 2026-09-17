create table if not exists public.audit_events (
  id text primary key,
  project_id text not null,
  timestamp timestamptz not null default now(),
  role text not null,
  action text not null,
  document_reference text not null,
  trade_discipline text not null,
  actor_name text,
  previous_status text,
  next_status text,
  previous_revision text,
  next_revision text
);

alter table public.cde_items add column if not exists revision_code text;

create index if not exists audit_events_project_timestamp_idx
  on public.audit_events (project_id, timestamp desc);

alter table public.audit_events enable row level security;

create policy "authenticated users can read project audit events"
  on public.audit_events for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can create project audit events"
  on public.audit_events for insert
  with check (auth.role() = 'authenticated');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cde_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cde_items;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rfis'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rfis;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'change_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.change_orders;
  END IF;
END $$;
