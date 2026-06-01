-- The public marketplace can read published catalogue data but cannot mutate it.
-- Scheduling exceptions and operational settings are admin-only.

alter table public.clinics enable row level security;
alter table public.specialists enable row level security;
alter table public.treatments enable row level security;
alter table public.treatment_durations enable row level security;
alter table public.specialist_availability enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.blocked_time_slots enable row level security;
alter table public.specialist_vacations enable row level security;
alter table public.app_settings enable row level security;
alter table public.email_templates enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'clinics',
        'specialists',
        'treatments',
        'treatment_durations',
        'specialist_availability',
        'blocked_dates',
        'blocked_time_slots',
        'specialist_vacations',
        'app_settings',
        'email_templates'
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

create policy clinics_public_select
  on public.clinics for select to anon, authenticated
  using (true);

create policy specialists_public_select
  on public.specialists for select to anon, authenticated
  using (true);

create policy treatments_public_select
  on public.treatments for select to anon, authenticated
  using (true);

create policy treatment_durations_public_select
  on public.treatment_durations for select to anon, authenticated
  using (true);

create policy specialist_availability_public_select
  on public.specialist_availability for select to anon, authenticated
  using (true);

create policy clinics_admin_all
  on public.clinics for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy specialists_admin_all
  on public.specialists for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy treatments_admin_all
  on public.treatments for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy treatment_durations_admin_all
  on public.treatment_durations for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy specialist_availability_admin_all
  on public.specialist_availability for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy blocked_dates_admin_all
  on public.blocked_dates for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy blocked_time_slots_admin_all
  on public.blocked_time_slots for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy specialist_vacations_admin_all
  on public.specialist_vacations for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy app_settings_admin_all
  on public.app_settings for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy email_templates_admin_all
  on public.email_templates for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
