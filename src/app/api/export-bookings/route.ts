import { NextResponse } from "next/server";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function escapeCsvValue(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

export async function GET() {
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

    const { data: bookings } =
      await supabase
        .from("bookings")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    const headers = [
      "Paciente",
      "Clinica",
      "Tratamiento",
      "Fecha",
      "Estado",
    ];

    const rows =
      bookings?.map(
        (booking) => [
          booking.full_name,
          booking.clinic_name,
          booking.treatment,
          booking.booking_date,
          booking.status,
        ]
      ) || [];

    const csv = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type":
          "text/csv",

        "Content-Disposition":
          'attachment; filename="reservas-encuentratuclinica.csv"',
      },
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
