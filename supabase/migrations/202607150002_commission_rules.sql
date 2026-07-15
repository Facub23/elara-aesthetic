create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text,
  target_name text not null,
  commission_rate numeric(5, 2) not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commission_rules
  drop constraint if exists commission_rules_target_type_check;

alter table public.commission_rules
  add constraint commission_rules_target_type_check
  check (target_type in ('clinic', 'specialist')) not valid;

alter table public.commission_rules
  drop constraint if exists commission_rules_rate_check;

alter table public.commission_rules
  add constraint commission_rules_rate_check
  check (commission_rate >= 0 and commission_rate <= 100) not valid;

create unique index if not exists commission_rules_target_unique
  on public.commission_rules (target_type, coalesce(target_id, ''), lower(target_name));

create index if not exists commission_rules_active_type_idx
  on public.commission_rules (active, target_type);

alter table public.commission_rules enable row level security;

drop policy if exists commission_rules_admin_all on public.commission_rules;

create policy commission_rules_admin_all
  on public.commission_rules
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
