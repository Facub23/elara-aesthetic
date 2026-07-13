import { NextResponse } from "next/server";

import { isBookingInAdminScope } from "@/lib/admin-scope";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id,role,clinic_id,specialist_id,access_role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Notification id requerido",
        },
        {
          status: 400,
        }
      );
    }

    const { data: notification } = await supabase
      .from("admin_notifications")
      .select("id,related_booking_id")
      .eq("id", id)
      .maybeSingle();

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: "Notification no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    if (notification.related_booking_id) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("clinic_name,specialist_name")
        .eq("id", notification.related_booking_id)
        .maybeSingle();

      if (
        !booking ||
        !(await isBookingInAdminScope({
          role: adminUser.role,
          clinicId: adminUser.clinic_id,
          specialistId: adminUser.specialist_id,
          accessRole: adminUser.access_role,
        }, booking))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Notification no encontrada",
          },
          {
            status: 404,
          }
        );
      }
    } else if (adminUser.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Notification no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    const { error } = await supabase
      .from("admin_notifications")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("id", id);

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

    return NextResponse.json({
      success: true,
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
