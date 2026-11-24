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
