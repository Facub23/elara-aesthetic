import { NextResponse } from "next/server";

import { sendNotificationChannel } from "@/lib/notification-channels";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type NotificationChannel = "email" | "whatsapp" | "sms";

type NotificationDelivery = {
  id: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string | null;
  related_booking_id: string | number | null;
};

const allowedChannels = ["email", "whatsapp", "sms"];

async function ensureAdmin() {
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
  };
}

export async function POST(req: Request) {
  const admin = await ensureAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      {
        success: false,
        error: admin.error,
      },
      {
        status: admin.status,
      }
    );
  }

  try {
    const body = await req.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Delivery id requerido",
        },
        {
          status: 400,
        }
      );
    }

    const { data: delivery, error } = await supabase
      .from("notification_deliveries")
      .select(
        "id,channel,recipient,subject,message,related_booking_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Entrega no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    const typedDelivery = delivery as NotificationDelivery;

    if (!allowedChannels.includes(typedDelivery.channel)) {
      return NextResponse.json(
        {
          success: false,
          error: "Canal no soportado",
        },
        {
          status: 400,
        }
      );
    }

    const result = await sendNotificationChannel({
      channel: typedDelivery.channel as NotificationChannel,
      recipient: typedDelivery.recipient,
      subject: typedDelivery.subject,
      title: typedDelivery.subject || "EncuentraTuClinica",
      message: typedDelivery.message || "",
      relatedBookingId: typedDelivery.related_booking_id,
    });

    return NextResponse.json({
      success: true,
      status: result.status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
