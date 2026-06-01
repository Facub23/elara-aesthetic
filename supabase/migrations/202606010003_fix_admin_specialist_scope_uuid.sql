alter table public.admin_users
  alter column specialist_id type uuid
  using specialist_id::text::uuid;

alter table public.admin_access_requests
  alter column requested_specialist_id type uuid
  using requested_specialist_id::text::uuid;
