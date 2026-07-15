alter table public.admin_users
  drop constraint if exists admin_users_access_role_check;

alter table public.admin_users
  add constraint admin_users_access_role_check
  check (
    access_role in (
      'clinic_owner',
      'clinic_manager',
      'reception',
      'specialist',
      'independent_specialist',
      'content_editor',
      'finance',
      'super_admin'
    )
  );

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
      'independent_specialist',
      'content_editor',
      'finance'
    )
  );
