-- Persist the most recent reschedule origin and previous appointment for admin traceability.

alter table public.bookings
  add column if not exists rescheduled_at timestamptz,
  add column if not exists rescheduled_by text,
  add column if not exists previous_booking_date text,
  add column if not exists previous_booking_time text;

alter table public.bookings
  drop constraint if exists bookings_rescheduled_by_check;

alter table public.bookings
  add constraint bookings_rescheduled_by_check
  check (rescheduled_by is null or rescheduled_by in ('patient', 'admin'))
  not valid;

alter table public.bookings
  validate constraint bookings_rescheduled_by_check;
