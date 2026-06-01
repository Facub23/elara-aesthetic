update public.email_templates
set
  body = 'Hola {{nombre}}, recibimos tu solicitud para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}}.

Para confirmar tu reserva, entra en el enlace seguro. Tu cita quedara pendiente hasta que completes este paso.',
  updated_at = now()
where key = 'booking_created_patient';

update public.email_templates
set
  body = '{{nombre}} solicito {{tratamiento}} con {{especialista}} en {{clinica}}{{fecha_label}}.

Contacto: {{email}}{{telefono_label}}.',
  updated_at = now()
where key = 'booking_created_admin';

update public.email_templates
set
  body = 'Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}} quedo confirmada.

Te esperamos en la fecha indicada.',
  updated_at = now()
where key = 'manual_booking_patient';

update public.email_templates
set
  body = '{{nombre}} confirmo su cita con {{especialista}}{{fecha_label}}.

Tratamiento: {{tratamiento}}. Clinica: {{clinica}}.',
  updated_at = now()
where key = 'booking_confirmed_admin';

update public.email_templates
set
  body = 'Hola {{nombre}}, tu reserva queda ahora en estado {{estado}}{{fecha_label}}.{{cambio_anterior}}

Tratamiento: {{tratamiento}}. Especialista: {{especialista}}.',
  updated_at = now()
where key = 'booking_updated_patient';

update public.email_templates
set
  body = 'Hola {{nombre}}, te recordamos tu cita para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}}.

Si necesitas cambiarla, responde a este mensaje o contacta con la clinica.',
  updated_at = now()
where key = 'reminder_24h_patient';

update public.email_templates
set
  body = 'Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}} con {{especialista}} comienza pronto{{fecha_label}}.

Te recomendamos llegar unos minutos antes.',
  updated_at = now()
where key = 'reminder_2h_patient';
