import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

type AdminNotificationInput = {
  title: string;
  description?: string | null;
  type?: "booking" | "reminder" | "system";
  relatedBookingId?: string | number | null;
};

export async function createAdminNotification({
  title,
  description,
  type = "system",
  relatedBookingId,
}: AdminNotificationInput) {
  await supabase.from("admin_notifications").insert({
    title,
    description,
    type,
    related_booking_id: relatedBookingId ?? null,
  });
}
