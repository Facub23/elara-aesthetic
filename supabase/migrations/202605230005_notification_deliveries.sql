create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  recipient text,
  subject text,
  message text,
  status text not null default 'pending',
  provider text,
  related_booking_id bigint,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_deliveries_created_at_idx
  on public.notification_deliveries (created_at desc);

create index if not exists notification_deliveries_channel_status_idx
  on public.notification_deliveries (channel, status);

create index if not exists notification_deliveries_booking_idx
  on public.notification_deliveries (related_booking_id);
