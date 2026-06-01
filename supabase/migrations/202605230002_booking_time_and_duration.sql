alter table public.bookings
  add column if not exists booking_time time,
  add column if not exists duration_minutes integer;

update public.bookings
set booking_time =
  case
    when booking_date::text ~ '[0-9]{2}:[0-9]{2}'
      then substring(booking_date::text from '[0-9]{2}:[0-9]{2}')::time
    else booking_time
  end
where booking_time is null;

update public.bookings
set duration_minutes = 60
where duration_minutes is null;

alter table public.bookings
  alter column duration_minutes set default 60;

alter table public.bookings
  add constraint bookings_duration_minutes_positive
  check (duration_minutes > 0) not valid;
