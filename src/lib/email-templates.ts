export type EmailTemplateKey =
  | "booking_created_patient"
  | "booking_created_admin"
  | "manual_booking_patient"
  | "booking_confirmed_patient"
  | "booking_confirmed_admin"
  | "booking_updated_patient"
  | "reminder_24h_patient"
  | "reminder_2h_patient"
  | "review_request_patient";

export type EmailTemplate = {
  key: EmailTemplateKey;
  name: string;
  description: string;
  subject: string;
  title: string;
  body: string;
  cta_label: string | null;
  active: boolean;
  sort_order: number;
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: "booking_created_patient",
    name: "Solicitud recibida",
    description: "Se envia al paciente cuando solicita una reserva desde la web.",
    subject: "Confirma tu reserva en EncuentraTuClinica",
    title: "Confirma tu reserva",
    body:
      "Hola {{nombre}}, recibimos tu solicitud para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}}.\n\nPara confirmar tu reserva, entra en el enlace seguro. Tu cita quedara pendiente hasta que completes este paso.",
    cta_label: "Confirmar reserva",
    active: true,
    sort_order: 10,
  },
  {
    key: "booking_created_admin",
    name: "Nueva reserva admin",
    description: "Se envia al equipo cuando entra una nueva reserva pendiente.",
    subject: "Nueva reserva pendiente en EncuentraTuClinica",
    title: "Nueva reserva pendiente",
    body:
      "{{nombre}} solicito {{tratamiento}} con {{especialista}} en {{clinica}}{{fecha_label}}.\n\nContacto: {{email}}{{telefono_label}}.",
    cta_label: null,
    active: true,
    sort_order: 20,
  },
  {
    key: "manual_booking_patient",
    name: "Reserva manual confirmada",
    description: "Se envia al paciente cuando el equipo crea una reserva manual.",
    subject: "Tu cita en EncuentraTuClinica esta confirmada",
    title: "Cita confirmada",
    body:
      "Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}} quedo confirmada.\n\nTe esperamos en la fecha indicada.",
    cta_label: null,
    active: true,
    sort_order: 30,
  },
  {
    key: "booking_confirmed_admin",
    name: "Confirmacion del paciente",
    description: "Se envia al equipo cuando el paciente confirma su reserva.",
    subject: "Reserva confirmada en EncuentraTuClinica",
    title: "Reserva confirmada",
    body:
      "{{nombre}} confirmo su cita con {{especialista}}{{fecha_label}}.\n\nTratamiento: {{tratamiento}}. Clinica: {{clinica}}.",
    cta_label: null,
    active: true,
    sort_order: 40,
  },
  {
    key: "booking_confirmed_patient",
    name: "Reserva confirmada paciente",
    description: "Se envia al paciente cuando confirma su cita desde el enlace seguro.",
    subject: "Tu cita esta confirmada en EncuentraTuClinica",
    title: "Cita confirmada",
    body:
      "Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}} ha quedado confirmada.\n\nSi necesitas reprogramarla o cancelarla, utiliza tu enlace seguro.",
    cta_label: "Gestionar cita",
    active: true,
    sort_order: 45,
  },
  {
    key: "booking_updated_patient",
    name: "Reserva actualizada",
    description: "Se envia al paciente cuando cambia fecha, hora o estado.",
    subject: "Tu reserva en EncuentraTuClinica fue actualizada",
    title: "Reserva actualizada",
    body:
      "Hola {{nombre}}, tu reserva queda ahora en estado {{estado}}{{fecha_label}}.{{cambio_anterior}}\n\nTratamiento: {{tratamiento}}. Especialista: {{especialista}}.",
    cta_label: "Gestionar cita",
    active: true,
    sort_order: 50,
  },
  {
    key: "reminder_24h_patient",
    name: "Recordatorio 24h",
    description: "Se envia el dia anterior a la cita.",
    subject: "Recordatorio de tu cita en EncuentraTuClinica",
    title: "Tu cita es manana",
    body:
      "Hola {{nombre}}, te recordamos tu cita para {{tratamiento}} en {{clinica}} con {{especialista}}{{fecha_label}}.\n\nSi necesitas cambiarla, responde a este mensaje o contacta con la clinica.",
    cta_label: null,
    active: true,
    sort_order: 60,
  },
  {
    key: "reminder_2h_patient",
    name: "Recordatorio 2h",
    description: "Se envia dos horas antes de la cita.",
    subject: "Tu cita en EncuentraTuClinica comienza pronto",
    title: "Tu cita comienza en 2 horas",
    body:
      "Hola {{nombre}}, tu cita para {{tratamiento}} en {{clinica}} con {{especialista}} comienza pronto{{fecha_label}}.\n\nTe recomendamos llegar unos minutos antes.",
    cta_label: null,
    active: true,
    sort_order: 70,
  },
  {
    key: "review_request_patient",
    name: "Solicitud de opinion",
    description: "Se envia cuando una cita completada puede recibir una opinion verificada.",
    subject: "Como fue tu experiencia en EncuentraTuClinica?",
    title: "Tu opinion ayuda a elegir mejor",
    body:
      "Hola {{nombre}}, gracias por confiar en EncuentraTuClinica.\n\nComparte como fue tu experiencia con {{tratamiento}} en {{clinica}}. Solo publicaremos opiniones revisadas de reservas completadas.",
    cta_label: "Compartir mi experiencia",
    active: true,
    sort_order: 80,
  },
];

export function mergeEmailTemplates(
  templates: Partial<EmailTemplate>[] | null | undefined
) {
  return DEFAULT_EMAIL_TEMPLATES.map((defaultTemplate) => {
    const savedTemplate = templates?.find(
      (template) => template.key === defaultTemplate.key
    );

    return {
      ...defaultTemplate,
      ...savedTemplate,
      key: defaultTemplate.key,
    };
  });
}

export function renderEmailTemplateText(
  value: string,
  variables: Record<string, string | number | null | undefined>
) {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(variables[key] ?? "")
  );
}
