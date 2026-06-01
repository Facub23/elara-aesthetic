-- Keep marketplace reviews public only after moderation and protect internal admin data.

alter table public.reviews enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'reviews',
        'admin_users',
        'activity_logs',
        'patient_activity',
        'patient_notes',
        'notification_deliveries',
        'admin_notifications'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end
$$;

drop policy if exists reviews_public_approved_select on public.reviews;
drop policy if exists reviews_patient_select on public.reviews;
drop policy if exists reviews_admin_all on public.reviews;

create policy reviews_public_approved_select
  on public.reviews
  for select
  to anon, authenticated
  using (status = 'Aprobada');

create policy reviews_patient_select
  on public.reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings
      where public.bookings.id = public.reviews.booking_id
        and lower(public.bookings.email) =
          lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy reviews_admin_all
  on public.reviews
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

alter table public.admin_users enable row level security;

drop policy if exists admin_users_self_select on public.admin_users;
drop policy if exists admin_users_admin_select on public.admin_users;

create policy admin_users_self_select
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

create policy admin_users_admin_select
  on public.admin_users
  for select
  to authenticated
  using (public.is_admin_user());

alter table public.activity_logs enable row level security;
alter table public.patient_activity enable row level security;
alter table public.patient_notes enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists activity_logs_admin_all on public.activity_logs;
drop policy if exists patient_activity_admin_all on public.patient_activity;
drop policy if exists patient_notes_admin_all on public.patient_notes;
drop policy if exists notification_deliveries_admin_all on public.notification_deliveries;
drop policy if exists admin_notifications_admin_all on public.admin_notifications;

create policy activity_logs_admin_all
  on public.activity_logs
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy patient_activity_admin_all
  on public.patient_activity
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy patient_notes_admin_all
  on public.patient_notes
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy notification_deliveries_admin_all
  on public.notification_deliveries
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy admin_notifications_admin_all
  on public.admin_notifications
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
