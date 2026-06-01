create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite_clinics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id text,
  clinic_name text not null,
  clinic_slug text not null,
  clinic_location text,
  created_at timestamptz not null default now(),
  unique (user_id, clinic_slug)
);

create table if not exists public.favorite_specialists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  specialist_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, specialist_id)
);

alter table public.patient_profiles enable row level security;
alter table public.favorite_clinics enable row level security;
alter table public.favorite_specialists enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('patient_profiles', 'favorite_clinics', 'favorite_specialists')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end
$$;

drop policy if exists patient_profiles_owner_select on public.patient_profiles;
drop policy if exists patient_profiles_owner_insert on public.patient_profiles;
drop policy if exists patient_profiles_owner_update on public.patient_profiles;
drop policy if exists favorite_clinics_owner_select on public.favorite_clinics;
drop policy if exists favorite_clinics_owner_insert on public.favorite_clinics;
drop policy if exists favorite_clinics_owner_delete on public.favorite_clinics;
drop policy if exists favorite_specialists_owner_select on public.favorite_specialists;
drop policy if exists favorite_specialists_owner_insert on public.favorite_specialists;
drop policy if exists favorite_specialists_owner_delete on public.favorite_specialists;

create policy patient_profiles_owner_select
  on public.patient_profiles for select to authenticated
  using (auth.uid() = user_id);

create policy patient_profiles_owner_insert
  on public.patient_profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy patient_profiles_owner_update
  on public.patient_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy favorite_clinics_owner_select
  on public.favorite_clinics for select to authenticated
  using (auth.uid() = user_id);

create policy favorite_clinics_owner_insert
  on public.favorite_clinics for insert to authenticated
  with check (auth.uid() = user_id);

create policy favorite_clinics_owner_delete
  on public.favorite_clinics for delete to authenticated
  using (auth.uid() = user_id);

create policy favorite_specialists_owner_select
  on public.favorite_specialists for select to authenticated
  using (auth.uid() = user_id);

create policy favorite_specialists_owner_insert
  on public.favorite_specialists for insert to authenticated
  with check (auth.uid() = user_id);

create policy favorite_specialists_owner_delete
  on public.favorite_specialists for delete to authenticated
  using (auth.uid() = user_id);
