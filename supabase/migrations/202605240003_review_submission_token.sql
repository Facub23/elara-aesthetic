alter table public.bookings
  add column if not exists review_token uuid default gen_random_uuid(),
  add column if not exists review_requested_at timestamptz,
  add column if not exists review_request_count integer not null default 0;

update public.bookings
set review_token = gen_random_uuid()
where review_token is null;

create unique index if not exists bookings_review_token_idx
  on public.bookings (review_token)
  where review_token is not null;

alter table public.bookings
  add constraint bookings_review_request_count_positive
  check (review_request_count >= 0) not valid;
