import { createActivityLog } from "@/lib/activity";
import { createAdminNotification } from "@/lib/admin-notifications";
import { type EmailTemplateKey } from "@/lib/email-templates";
import { sendNotificationChannel } from "@/lib/notification-channels";
import { getRenderedEmailTemplate } from "@/lib/server-email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type BookingNotification = {
  id?: string | number | null;
  clinic_name?: string | null;
  specialist_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  treatment?: string | null;
  status?: string | null;
  cancellation_token?: string | null;
};

type NotificationOptions = {
  confirmationUrl?: string;
  cancellationUrl?: string;
  previousDate?: string | null;
  previousTime?: string | null;
  updatedBy?: "patient" | "admin";
};

function getBookingDate(booking: BookingNotification) {
  return (booking.booking_date || "").slice(0, 10);
}

function getBookingTime(booking: BookingNotification) {
  return (
    booking.booking_time?.slice(0, 5) ||
    booking.booking_date?.slice(11, 16) ||
    ""
  );
}

function getBookingLabel(booking: BookingNotification) {
  const date = getBookingDate(booking);
  const time = getBookingTime(booking);

  return [date, time].filter(Boolean).join(" a las ");
}

function getBookingVariables(
  booking: BookingNotification,
  extras: Record<string, string | number | null | undefined> = {}
) {
  const bookingLabel = getBookingLabel(booking);

  return {
    nombre: booking.full_name || "Paciente",
    email: booking.email || "",
    telefono: booking.phone || "",
    telefono_label: booking.phone ? ` - Telefono: ${booking.phone}` : "",
    tratamiento: cleanBrandText(booking.treatment) || "tu tratamiento",
    clinica: cleanBrandText(booking.clinic_name) || "EncuentraTuClinica",
    especialista: cleanBrandText(booking.specialist_name) || "nuestro equipo",
    fecha_label: bookingLabel ? ` el ${bookingLabel}` : "",
    estado: booking.status || "",
    cambio_anterior: "",
    ...extras,
  };
}

function cleanBrandText(value?: string | null) {
  return (value || "").replace(/ELARA/gi, "EncuentraTuClinica");
}

function getManageBookingUrl(booking: BookingNotification) {
  if (!booking.cancellation_token) return undefined;

  return `${getSiteUrl()}/cancel-booking?token=${encodeURIComponent(
    booking.cancellation_token
  )}`;
}

async function getAdminEmail() {
  const { data } = await supabase
    .from("app_settings")
    .select("main_email")
    .limit(1)
    .maybeSingle();

  return data?.main_email || process.env.ADMIN_EMAIL || null;
}

async function safeSendEmail({
  to,
  subject,
  title,
  message,
  ctaLabel,
  ctaUrl,
  failureLog,
  templateKey,
  templateVariables,
  relatedBookingId,
}: {
  to?: string | null;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  failureLog: string;
  templateKey?: EmailTemplateKey;
  templateVariables?: Record<string, string | number | null | undefined>;
  relatedBookingId?: string | number | null;
}) {
  if (!to) return;

  try {
    const renderedTemplate =
      templateKey && templateVariables
        ? await getRenderedEmailTemplate({
            key: templateKey,
            variables: templateVariables,
          })
        : null;

    if (templateKey && !renderedTemplate) return;

    await sendNotificationChannel({
      channel: "email",
      recipient: to,
      subject: renderedTemplate?.subject || subject,
      title: renderedTemplate?.title || title,
      message: renderedTemplate?.message || message,
      ctaLabel: renderedTemplate?.ctaLabel || ctaLabel,
      ctaUrl,
      relatedBookingId,
    });
  } catch {
    await createActivityLog({
      title: failureLog,
      description: to,
    });
  }
}

async function safeSendPlaceholderChannel({
  channel,
  to,
  subject,
  message,
  bookingId,
}: {
  channel: "whatsapp" | "sms";
  to?: string | null;
  subject: string;
  message: string;
  bookingId?: string | number | null;
}) {
  await sendNotificationChannel({
    channel,
    recipient: to,
    subject,
    title: subject,
    message,
    relatedBookingId: bookingId,
  });
}

export async function notifyBookingCreated(
  booking: BookingNotification,
  options: NotificationOptions = {}
) {
  const bookingLabel = getBookingLabel(booking);
  const variables = getBookingVariables(booking);

  await createActivityLog({
    title: "Nueva reserva recibida",
    description: `${booking.full_name || "Paciente"} - ${booking.clinic_name || "Clinica"} - ${bookingLabel}`,
  });

  await createAdminNotification({
    title: "Nueva reserva recibida",
    description: `${booking.full_name || "Paciente"} solicito ${booking.treatment || "un tratamiento"}${bookingLabel ? ` el ${bookingLabel}` : ""}.`,
    type: "booking",
    relatedBookingId: booking.id,
  });

  await safeSendEmail({
    to: booking.email,
    subject: "Confirma tu reserva en EncuentraTuClinica",
    title: "Confirma tu reserva",
    message: `Hola ${booking.full_name || ""}, recibimos tu solicitud para ${booking.treatment || "tu tratamiento"} en ${booking.clinic_name || "EncuentraTuClinica"}${bookingLabel ? ` el ${bookingLabel}` : ""}. Para confirmar tu reserva, entra en el enlace seguro.`,
    ctaLabel: options.confirmationUrl
      ? "Confirmar reserva"
      : undefined,
    ctaUrl: options.confirmationUrl,
    failureLog: "Email de confirmacion no enviado",
    templateKey: "booking_created_patient",
    templateVariables: variables,
    relatedBookingId: booking.id,
  });

  await safeSendPlaceholderChannel({
    channel: "whatsapp",
    to: booking.phone,
    subject: "Confirma tu reserva en EncuentraTuClinica",
    message: `Hola ${booking.full_name || ""}, confirma tu reserva en EncuentraTuClinica${bookingLabel ? ` para el ${bookingLabel}` : ""}.`,
    bookingId: booking.id,
  });

  await safeSendPlaceholderChannel({
    channel: "sms",
    to: booking.phone,
    subject: "Confirma tu reserva en EncuentraTuClinica",
    message: `EncuentraTuClinica: confirma tu reserva${bookingLabel ? ` para el ${bookingLabel}` : ""}.`,
    bookingId: booking.id,
  });

  await safeSendEmail({
    to: await getAdminEmail(),
    subject: "Nueva reserva pendiente en EncuentraTuClinica",
    title: "Nueva reserva pendiente",
    message: `${booking.full_name || "Paciente"} solicito ${booking.treatment || "un tratamiento"} con ${booking.specialist_name || "especialista"} en ${booking.clinic_name || "EncuentraTuClinica"}${bookingLabel ? ` el ${bookingLabel}` : ""}.`,
    failureLog: "Email admin de nueva reserva no enviado",
    templateKey: "booking_created_admin",
    templateVariables: variables,
    relatedBookingId: booking.id,
  });
}

export async function notifyManualBookingCreated(
  booking: BookingNotification,
  options: NotificationOptions = {}
) {
  const bookingLabel = getBookingLabel(booking);
  const variables = getBookingVariables(booking);

  await createActivityLog({
    title: "Reserva creada manualmente",
    description: `${booking.full_name || "Paciente"} - ${booking.specialist_name || "Especialista"} - ${bookingLabel}`,
  });

  await createAdminNotification({
    title: "Reserva manual creada",
    description: `${booking.full_name || "Paciente"} - ${booking.specialist_name || "Especialista"} - ${bookingLabel}`,
    type: "booking",
    relatedBookingId: booking.id,
  });

  await safeSendEmail({
    to: booking.email,
    subject: "Tu cita en EncuentraTuClinica esta confirmada",
    title: "Cita confirmada",
    message: `Hola ${booking.full_name || ""}, tu cita para ${booking.treatment || "tu tratamiento"} en ${booking.clinic_name || "EncuentraTuClinica"}${bookingLabel ? ` el ${bookingLabel}` : ""} quedo confirmada.`,
    failureLog: "Email de reserva manual no enviado",
    templateKey: "manual_booking_patient",
    templateVariables: variables,
    relatedBookingId: booking.id,
  });

  if (options.cancellationUrl) {
    await safeSendEmail({
      to: booking.email,
      subject: "Gestiona tu cita en EncuentraTuClinica",
      title: "Gestiona tu cita",
      message: "Si necesitas reprogramar o cancelar esta cita, utiliza tu enlace seguro.",
      ctaLabel: "Gestionar cita",
      ctaUrl: options.cancellationUrl,
      failureLog: "Email de gestion de cita no enviado",
      relatedBookingId: booking.id,
    });
  }

  await safeSendPlaceholderChannel({
    channel: "whatsapp",
    to: booking.phone,
    subject: "Cita confirmada en EncuentraTuClinica",
    message: `Tu cita en EncuentraTuClinica quedo confirmada${bookingLabel ? ` para el ${bookingLabel}` : ""}.`,
    bookingId: booking.id,
  });
}

export async function notifyBookingConfirmed(
  booking: BookingNotification,
  options: NotificationOptions = {}
) {
  const bookingLabel = getBookingLabel(booking);
  const variables = getBookingVariables(booking);

  await createActivityLog({
    title: "Reserva confirmada por paciente",
    description: `${booking.full_name || "Paciente"} - ${booking.clinic_name || "Clinica"} - ${bookingLabel}`,
  });

  await createAdminNotification({
    title: "Reserva confirmada",
    description: `${booking.full_name || "Paciente"} confirmo su cita${bookingLabel ? ` el ${bookingLabel}` : ""}.`,
    type: "booking",
    relatedBookingId: booking.id,
  });

  await safeSendEmail({
    to: await getAdminEmail(),
    subject: "Reserva confirmada en EncuentraTuClinica",
    title: "Reserva confirmada",
    message: `${booking.full_name || "Paciente"} confirmo su cita con ${booking.specialist_name || "especialista"}${bookingLabel ? ` el ${bookingLabel}` : ""}.`,
    failureLog: "Email admin de confirmacion no enviado",
    templateKey: "booking_confirmed_admin",
    templateVariables: variables,
    relatedBookingId: booking.id,
  });

  if (options.cancellationUrl) {
    await safeSendEmail({
      to: booking.email,
      subject: "Tu cita esta confirmada en EncuentraTuClinica",
      title: "Cita confirmada",
      message: `Hola ${booking.full_name || ""}, tu cita ha quedado confirmada. Si necesitas reprogramarla o cancelarla, utiliza tu enlace seguro.`,
      ctaLabel: "Gestionar cita",
      ctaUrl: options.cancellationUrl,
      failureLog: "Email paciente de cita confirmada no enviado",
      templateKey: "booking_confirmed_patient",
      templateVariables: variables,
      relatedBookingId: booking.id,
    });
  }
}

export async function notifyBookingUpdated(
  booking: BookingNotification,
  options: NotificationOptions = {}
) {
  const bookingLabel = getBookingLabel(booking);
  const status = booking.status || "Actualizada";
  const previousLabel = [options.previousDate, options.previousTime]
    .filter(Boolean)
    .join(" a las ");
  const variables = getBookingVariables(booking, {
    estado: status,
    cambio_anterior: previousLabel
      ? ` Antes figuraba para ${previousLabel}.`
      : "",
  });
  const updatedByPatient = options.updatedBy === "patient";
  const manageUrl =
    status === "Cancelada"
      ? undefined
      : options.cancellationUrl || getManageBookingUrl(booking);
  const updateTitle = updatedByPatient
    ? "Reserva reprogramada por paciente"
    : "Reserva actualizada";

  await createActivityLog({
    title: updateTitle,
    description: `Reserva #${booking.id || ""} - ${status} - ${bookingLabel}`,
  });

  await createAdminNotification({
    title: updateTitle,
    description: `${booking.full_name || "Paciente"} - ${status}${bookingLabel ? ` - ${bookingLabel}` : ""}`,
    type: "booking",
    relatedBookingId: booking.id,
  });

  await safeSendEmail({
    to: booking.email,
    subject: "Tu reserva en EncuentraTuClinica fue actualizada",
    title: "Reserva actualizada",
    message: `Hola ${booking.full_name || ""}, tu reserva queda ahora en estado ${status}${bookingLabel ? ` para el ${bookingLabel}` : ""}.${
      options.previousDate || options.previousTime
        ? ` Antes figuraba para ${[options.previousDate, options.previousTime].filter(Boolean).join(" a las ")}.`
        : ""
    }`,
    failureLog: "Email de actualizacion no enviado",
    templateKey: "booking_updated_patient",
    templateVariables: variables,
    ctaLabel: manageUrl ? "Gestionar cita" : undefined,
    ctaUrl: manageUrl,
    relatedBookingId: booking.id,
  });

  await safeSendPlaceholderChannel({
    channel: "whatsapp",
    to: booking.phone,
    subject: "Reserva actualizada en EncuentraTuClinica",
    message: `Tu reserva en EncuentraTuClinica fue actualizada: ${status}${bookingLabel ? ` - ${bookingLabel}` : ""}.`,
    bookingId: booking.id,
  });
}

export async function notifyBookingReminder(
  booking: BookingNotification,
  reminder: "24h" | "2h"
) {
  const bookingLabel = getBookingLabel(booking);
  const isTwoHourReminder = reminder === "2h";
  const variables = getBookingVariables(booking);

  await safeSendEmail({
    to: booking.email,
    subject: isTwoHourReminder
      ? "Tu cita en EncuentraTuClinica comienza pronto"
      : "Recordatorio de tu cita en EncuentraTuClinica",
    title: isTwoHourReminder
      ? "Tu cita comienza en 2 horas"
      : "Tu cita es manana",
    message: `Hola ${booking.full_name || ""}, te recordamos tu cita para ${booking.treatment || "tu tratamiento"} en ${booking.clinic_name || "EncuentraTuClinica"} con ${booking.specialist_name || "nuestro equipo"}${bookingLabel ? ` el ${bookingLabel}` : ""}.`,
    failureLog: isTwoHourReminder
      ? "Recordatorio 2h no enviado"
      : "Recordatorio 24h no enviado",
    templateKey: isTwoHourReminder
      ? "reminder_2h_patient"
      : "reminder_24h_patient",
    templateVariables: variables,
    relatedBookingId: booking.id,
  });

  await safeSendPlaceholderChannel({
    channel: "whatsapp",
    to: booking.phone,
    subject: isTwoHourReminder
      ? "Tu cita empieza pronto"
      : "Recordatorio de cita EncuentraTuClinica",
    message: isTwoHourReminder
      ? `EncuentraTuClinica: tu cita comienza en 2 horas${bookingLabel ? ` (${bookingLabel})` : ""}.`
      : `EncuentraTuClinica: recuerda tu cita de manana${bookingLabel ? ` (${bookingLabel})` : ""}.`,
    bookingId: booking.id,
  });

  await safeSendPlaceholderChannel({
    channel: "sms",
    to: booking.phone,
    subject: isTwoHourReminder
      ? "Tu cita empieza pronto"
      : "Recordatorio de cita EncuentraTuClinica",
    message: isTwoHourReminder
      ? `EncuentraTuClinica: cita en 2h${bookingLabel ? ` ${bookingLabel}` : ""}.`
      : `EncuentraTuClinica: cita manana${bookingLabel ? ` ${bookingLabel}` : ""}.`,
    bookingId: booking.id,
  });

  await createActivityLog({
    title: isTwoHourReminder
      ? "Recordatorio 2h enviado"
      : "Recordatorio 24h enviado",
    description: `${booking.full_name || "Paciente"} - ${bookingLabel}`,
  });

  await createAdminNotification({
    title: isTwoHourReminder
      ? "Recordatorio 2h enviado"
      : "Recordatorio 24h enviado",
    description: `${booking.full_name || "Paciente"} - ${bookingLabel}`,
    type: "reminder",
    relatedBookingId: booking.id,
  });
}
