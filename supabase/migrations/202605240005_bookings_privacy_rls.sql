create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

alter table public.bookings enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
  loop
    execute format(
      'drop policy if exists %I on public.bookings',
      policy_record.policyname
    );
  end loop;
end
$$;

drop policy if exists bookings_patient_select on public.bookings;
drop policy if exists bookings_admin_select on public.bookings;
drop policy if exists bookings_admin_update on public.bookings;
drop policy if exists bookings_admin_delete on public.bookings;

create policy bookings_patient_select
  on public.bookings for select to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy bookings_admin_select
  on public.bookings for select to authenticated
  using (public.is_admin_user());

create policy bookings_admin_update
  on public.bookings for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy bookings_admin_delete
  on public.bookings for delete to authenticated
  using (public.is_admin_user());
