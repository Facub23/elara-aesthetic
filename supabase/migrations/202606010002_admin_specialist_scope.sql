alter table public.admin_users
  add column if not exists specialist_id uuid;

alter table public.admin_access_requests
  add column if not exists requested_specialist_id uuid;

create index if not exists admin_users_specialist_id_idx
  on public.admin_users (specialist_id);

create index if not exists admin_access_requests_requested_specialist_id_idx
  on public.admin_access_requests (requested_specialist_id);
