import { sendBookingEmail } from "@/lib/email";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type NotificationChannel = "email" | "whatsapp" | "sms";
type DeliveryStatus = "sent" | "failed" | "skipped";

type DeliveryInput = {
  channel: NotificationChannel;
  recipient?: string | null;
  subject?: string | null;
  title?: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  relatedBookingId?: string | number | null;
};

async function logDelivery({
  channel,
  recipient,
  subject,
  message,
  status,
  provider,
  relatedBookingId,
  error,
}: DeliveryInput & {
  status: DeliveryStatus;
  provider?: string;
  error?: string;
}) {
  await supabase.from("notification_deliveries").insert({
    channel,
    recipient: recipient || null,
    subject: subject || null,
    message,
    status,
    provider,
    related_booking_id: relatedBookingId ?? null,
    error: error || null,
    sent_at:
      status === "sent"
        ? new Date().toISOString()
        : null,
  });
}

export async function sendNotificationChannel({
  channel,
  recipient,
  subject,
  title,
  message,
  ctaLabel,
  ctaUrl,
  relatedBookingId,
}: DeliveryInput) {
  if (!recipient) {
    await logDelivery({
      channel,
      recipient,
      subject,
      message,
      relatedBookingId,
      status: "skipped",
      provider: channel === "email" ? "resend" : "placeholder",
      error: "Recipient missing",
    });

    return {
      status: "skipped" as const,
    };
  }

  if (channel === "email") {
    try {
      await sendBookingEmail({
        to: recipient,
        subject: subject || "EncuentraTuClinica",
        title: title || subject || "EncuentraTuClinica",
        message,
        ctaLabel,
        ctaUrl,
      });

      await logDelivery({
        channel,
        recipient,
        subject,
        message,
        relatedBookingId,
        status: "sent",
        provider: "resend",
      });

      return {
        status: "sent" as const,
      };
    } catch (error: unknown) {
      await logDelivery({
        channel,
        recipient,
        subject,
        message,
        relatedBookingId,
        status: "failed",
        provider: "resend",
        error:
          error instanceof Error
            ? error.message
            : "Unknown email error",
      });

      throw error;
    }
  }

  await logDelivery({
    channel,
    recipient,
    subject,
    message,
    relatedBookingId,
    status: "skipped",
    provider: "placeholder",
    error:
      channel === "whatsapp"
        ? "WhatsApp provider not configured"
        : "SMS provider not configured",
  });

  return {
    status: "skipped" as const,
  };
}
