alter table public.bookings
  add column if not exists booking_source text,
  add column if not exists source_url text,
  add column if not exists booking_context jsonb default '{}'::jsonb;

create index if not exists bookings_booking_source_idx
  on public.bookings(booking_source);
