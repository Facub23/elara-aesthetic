create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  subject text not null,
  title text not null,
  body text not null,
  cta_label text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_templates_sort_order_idx
  on public.email_templates (sort_order);

insert into public.email_templates
  (key, name, description, subject, title, body, cta_label, active, sort_order)
values
  (
    'booking_created_patient',
    'Solicitud recibida',
    'Se envia al paciente cuando solicita una reserva desde la web.',
    'Confirma tu reserva en EncuentraTuClinica',
    'Confirma tu reserva',
    'Hola {{nombre}}, recibimos tu solicitud para {{tratamiento}} en {{clinica}}{{fecha_label}}. Para confirmar tu reserva, entra en el enlace seguro.',
    'Confirmar reserva',
    true,
    10
  ),
  (
    'booking_created_admin',
    'Nueva reserva admin',
    'Se envia al equipo cuando entra una nueva reserva pendiente.',
    'Nueva reserva pendiente en EncuentraTuClinica',
    'Nueva reserva pendiente',
    '{{nombre}} solicito {{tratamiento}} con {{especialista}} en {{clinica}}{{fecha_label}}.',
    null,
    true,
    20
  ),
  (
    'manual_booking_patient',
    'Reserva manual confirmada',
    'Se envia al paciente cuando el equipo crea una reserva manual.',
    'Tu cita en EncuentraTuClinica esta confirmada',
    'Cita confirmada',
    'Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}}{{fecha_label}} quedo confirmada.',
    null,
    true,
    30
  ),
  (
    'booking_confirmed_admin',
    'Confirmacion del paciente',
    'Se envia al equipo cuando el paciente confirma su reserva.',
    'Reserva confirmada en EncuentraTuClinica',
    'Reserva confirmada',
    '{{nombre}} confirmo su cita con {{especialista}}{{fecha_label}}.',
    null,
    true,
    40
  ),
  (
    'booking_updated_patient',
    'Reserva actualizada',
    'Se envia al paciente cuando cambia fecha, hora o estado.',
    'Tu reserva en EncuentraTuClinica fue actualizada',
    'Reserva actualizada',
    'Hola {{nombre}}, tu reserva queda ahora en estado {{estado}}{{fecha_label}}.{{cambio_anterior}}',
    null,
    true,
    50
  ),
  (
    'reminder_24h_patient',
    'Recordatorio 24h',
    'Se envia el dia anterior a la cita.',
    'Recordatorio de tu cita en EncuentraTuClinica',
    'Tu cita es manana',
    'Hola {{nombre}}, te recordamos tu cita para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}}.',
    null,
    true,
    60
  ),
  (
    'reminder_2h_patient',
    'Recordatorio 2h',
    'Se envia dos horas antes de la cita.',
    'Tu cita en EncuentraTuClinica comienza pronto',
    'Tu cita comienza en 2 horas',
    'Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}} con {{especialista}} comienza pronto{{fecha_label}}.',
    null,
    true,
    70
  )
on conflict (key) do nothing;
