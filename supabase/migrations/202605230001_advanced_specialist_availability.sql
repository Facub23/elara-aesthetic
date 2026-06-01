alter table public.specialist_availability
  add column if not exists day_of_week integer,
  add column if not exists active boolean,
  add column if not exists break_start_time time,
  add column if not exists break_end_time time,
  add column if not exists max_daily_bookings integer not null default 0,
  add column if not exists slot_interval_minutes integer not null default 30;

update public.specialist_availability
set day_of_week = weekday
where day_of_week is null
  and weekday is not null;

update public.specialist_availability
set active = is_active
where active is null
  and is_active is not null;

alter table public.specialist_availability
  add constraint specialist_availability_break_order
  check (
    break_start_time is null
    or break_end_time is null
    or break_start_time < break_end_time
  ) not valid;

alter table public.specialist_availability
  add constraint specialist_availability_daily_limit
  check (max_daily_bookings >= 0) not valid;

alter table public.specialist_availability
  add constraint specialist_availability_slot_interval
  check (
    slot_interval_minutes >= 5
    and slot_interval_minutes <= 120
  ) not valid;
