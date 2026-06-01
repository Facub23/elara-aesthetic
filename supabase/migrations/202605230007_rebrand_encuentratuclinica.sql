update public.email_templates
set
  subject = replace(subject, 'ELARA', 'EncuentraTuClinica'),
  title = replace(title, 'ELARA', 'EncuentraTuClinica'),
  body = replace(body, 'ELARA', 'EncuentraTuClinica'),
  cta_label = case
    when cta_label is null then null
    else replace(cta_label, 'ELARA', 'EncuentraTuClinica')
  end,
  updated_at = now()
where
  subject like '%ELARA%'
  or title like '%ELARA%'
  or body like '%ELARA%'
  or cta_label like '%ELARA%';

update public.app_settings
set
  brand_name = 'EncuentraTuClinica',
  main_email = replace(main_email, 'elara.com', 'encuentratuclinica.es')
where
  brand_name = 'ELARA'
  or main_email like '%elara.com%';
