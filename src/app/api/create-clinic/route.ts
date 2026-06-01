import { NextResponse } from "next/server";

import { getAdminRequestContext } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

import { createActivityLog } from "@/lib/activity";

export async function POST(
  req: Request
) {
  const admin = await getAdminRequestContext();

  if (admin?.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body =
      await req.json();

    const {
      name,
      city,
      country,
      image,
      slug,
      description,
      rating,
      patients,
      experience,
      whatsapp,
    } = body;

    const { data: clinic, error } =
      await supabase
        .from("clinics")
        .insert([
          {
            name,
            city,
            country,
            image,
            slug,
            description,
            rating,
            patients,
            experience,
            whatsapp,
          },
        ])
        .select("*")
        .single();

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
      title: "Clínica creada",
      description: `${name} creada en ${city}`,
      actor: admin,
      entityType: "clinic",
      entityId: clinic.id,
    });

    return NextResponse.json({
      success: true,
      clinic,
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
