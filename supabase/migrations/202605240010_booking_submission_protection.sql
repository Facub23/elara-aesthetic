-- Store only hashed submission fingerprints to rate limit automated booking requests.

create table if not exists public.booking_submission_attempts (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_submission_attempts_fingerprint_created_idx
  on public.booking_submission_attempts (fingerprint, created_at desc);

alter table public.booking_submission_attempts enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_submission_attempts'
  loop
    execute format(
      'drop policy if exists %I on public.booking_submission_attempts',
      policy_record.policyname
    );
  end loop;
end
$$;

create unique index if not exists bookings_active_exact_slot_unique
  on public.bookings (specialist_name, booking_date, booking_time)
  where status in (
    'Pendiente',
    'Pendiente confirmacion',
    'Confirmada',
    'Reprogramada'
  );
