-- Confirmation links expire and confirmed appointments can be cancelled securely.

alter table public.bookings
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists cancellation_token uuid default gen_random_uuid(),
  add column if not exists expired_at timestamptz,
  add column if not exists cancelled_at timestamptz;

update public.bookings
set cancellation_token = gen_random_uuid()
where cancellation_token is null;

update public.bookings
set confirmation_expires_at = coalesce(created_at, now()) + interval '30 minutes'
where status in ('Pendiente', 'Pendiente confirmacion', 'Pendiente confirmación')
  and confirmed_by_client is not true
  and confirmation_expires_at is null;

create unique index if not exists bookings_cancellation_token_idx
  on public.bookings (cancellation_token)
  where cancellation_token is not null;

create index if not exists bookings_confirmation_expiry_idx
  on public.bookings (confirmation_expires_at)
  where status in ('Pendiente', 'Pendiente confirmacion', 'Pendiente confirmación');
