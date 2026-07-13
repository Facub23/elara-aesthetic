alter table public.specialists
  add column if not exists consultation_address text;

create index if not exists specialists_consultation_address_idx
  on public.specialists using btree (consultation_address)
  where consultation_address is not null;
