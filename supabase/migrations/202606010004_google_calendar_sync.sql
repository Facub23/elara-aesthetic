create table if not exists public.specialist_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null unique,
  specialist_name text not null,
  calendar_id text not null default 'primary',
  google_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected',
  connected_by_admin_id uuid,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.specialist_google_calendar_connections
  drop constraint if exists specialist_google_calendar_connections_status_check;

alter table public.specialist_google_calendar_connections
  add constraint specialist_google_calendar_connections_status_check
  check (status in ('connected', 'disconnected', 'error'));

create index if not exists specialist_google_calendar_connections_specialist_idx
  on public.specialist_google_calendar_connections (specialist_id);

create table if not exists public.google_calendar_oauth_states (
  state text primary key,
  specialist_id uuid not null,
  admin_user_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_sync_status text,
  add column if not exists google_calendar_synced_at timestamptz,
  add column if not exists google_calendar_last_error text;

create index if not exists bookings_google_calendar_event_id_idx
  on public.bookings (google_calendar_event_id);
