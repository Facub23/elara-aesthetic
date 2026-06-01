alter table public.specialists
  add column if not exists clinic_id integer references public.clinics(id) on delete set null;

update public.specialists specialist
set clinic_id = clinic.id
from public.clinics clinic
where specialist.clinic_id is null
  and lower(trim(specialist.clinic_name)) = lower(trim(clinic.name));

create index if not exists specialists_clinic_id_idx
  on public.specialists(clinic_id);
