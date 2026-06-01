insert into public.treatments (name, slug, description, image)
select
  'Mentón',
  'menton',
  'Tratamiento de mentón disponible con especialistas verificados en EncuentraTuClinica.',
  null
where not exists (
  select 1 from public.treatments where slug = 'menton'
);

insert into public.treatments (name, slug, description, image)
select
  'Mandíbula',
  'mandibula',
  'Tratamiento de mandíbula disponible con especialistas verificados en EncuentraTuClinica.',
  null
where not exists (
  select 1 from public.treatments where slug = 'mandibula'
);
