create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'system',
  related_booking_id bigint,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_read_at_idx
  on public.admin_notifications (read_at);
