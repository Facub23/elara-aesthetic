import { NextResponse } from "next/server";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { createActivityLog } from "@/lib/activity";

export async function POST(
  req: Request
) {
  try {
    const supabaseAuth =
      await createClient();

    const {
      data: { user },
    } =
      await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { data: adminUser } =
      await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    if (adminUser.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo el superadmin puede eliminar datos de prueba",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await req.json();

    const { id } = body;

    const { error } =
      await supabase
        .from("bookings")
        .delete()
        .eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        {
          status: 500,
        }
      );
    }

    await createActivityLog({
      title: "Reserva eliminada",
      description: `Reserva #${id} eliminada`,
      actor: {
        userId: user.id,
        email: user.email,
        role: adminUser.role,
      },
      entityType: "booking",
      entityId: id,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
