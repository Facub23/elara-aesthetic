alter table public.bookings
  add column if not exists reminder_24h_sent_at timestamptz,
  add column if not exists reminder_2h_sent_at timestamptz;
