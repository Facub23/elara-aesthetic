-- Controlled access onboarding for clinics and internal team members.

alter table public.admin_users
  add column if not exists clinic_id integer references public.clinics(id) on delete set null,
  add column if not exists access_role text not null default 'clinic_manager',
  add column if not exists permissions text[] not null default '{}',
  add column if not exists status text not null default 'active';

alter table public.admin_users
  drop constraint if exists admin_users_access_role_check;

alter table public.admin_users
  add constraint admin_users_access_role_check
  check (
    access_role in (
      'super_admin',
      'clinic_owner',
      'clinic_manager',
      'reception',
      'specialist',
      'content_editor',
      'finance'
    )
  ) not valid;

alter table public.admin_users
  drop constraint if exists admin_users_status_check;

alter table public.admin_users
  add constraint admin_users_status_check
  check (status in ('active', 'suspended')) not valid;

create table if not exists public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  requested_clinic_id integer references public.clinics(id) on delete set null,
  requested_clinic_name text,
  requested_access_role text not null default 'clinic_manager',
  requested_permissions text[] not null default '{}',
  message text,
  status text not null default 'pending',
  reviewed_by_admin_id text,
  reviewed_at timestamptz,
  review_note text,
  created_admin_user_id text,
  created_at timestamptz not null default now()
);

alter table public.admin_access_requests
  drop constraint if exists admin_access_requests_status_check;

alter table public.admin_access_requests
  add constraint admin_access_requests_status_check
  check (status in ('pending', 'approved', 'rejected')) not valid;

alter table public.admin_access_requests
  drop constraint if exists admin_access_requests_access_role_check;

alter table public.admin_access_requests
  add constraint admin_access_requests_access_role_check
  check (
    requested_access_role in (
      'clinic_owner',
      'clinic_manager',
      'reception',
      'specialist',
      'content_editor',
      'finance'
    )
  ) not valid;

create index if not exists admin_access_requests_status_created_at_idx
  on public.admin_access_requests (status, created_at desc);

create index if not exists admin_access_requests_email_idx
  on public.admin_access_requests (lower(email));

alter table public.admin_access_requests enable row level security;

drop policy if exists admin_access_requests_admin_all on public.admin_access_requests;

create policy admin_access_requests_admin_all
  on public.admin_access_requests
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
