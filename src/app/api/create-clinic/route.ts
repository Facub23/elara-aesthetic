import { NextResponse } from "next/server";

import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

import { createActivityLog } from "@/lib/activity";

function canManageGlobalContent(admin: Awaited<ReturnType<typeof getAdminRequestContext>>) {
  return admin?.role === "super_admin" || admin?.accessRole === "content_editor";
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function getClinicValidationIssue({
  name,
  city,
  country,
  image,
  location,
  slug,
  description,
}: {
  name?: string;
  city?: string;
  country?: string;
  image?: string;
  location?: string;
  slug?: string;
  description?: string;
}) {
  if (!hasText(name)) return "Falta el nombre de la clinica.";
  if (!hasText(slug)) return "Falta el slug de la clinica.";
  if (!hasText(description)) return "Falta la descripcion de la clinica.";
  if (!hasText(city)) return "Falta la ciudad de la clinica.";
  if (!hasText(country)) return "Falta el pais de la clinica.";
  if (!hasText(location)) return "Falta al menos una direccion de atencion.";
  if (!hasText(image)) return "Falta subir la imagen principal de la clinica.";

  return "";
}

export async function POST(
  req: Request
) {
  const admin = await getAdminRequestContext();

  if (!hasAdminPermission(admin, "content") || !canManageGlobalContent(admin)) {
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
      location,
      slug,
      description,
      rating,
      patients,
      experience,
      whatsapp,
    } = body;

    const validationIssue = getClinicValidationIssue({
      name,
      city,
      country,
      image,
      location,
      slug,
      description,
    });

    if (validationIssue) {
      return NextResponse.json(
        { success: false, error: validationIssue },
        { status: 400 }
      );
    }

    const { data: existingClinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingClinic) {
      return NextResponse.json(
        { success: false, error: "Ya existe una clinica con ese slug." },
        { status: 409 }
      );
    }

    const { data: clinic, error } =
      await supabase
        .from("clinics")
        .insert([
          {
            name,
            city,
            country,
            image,
            location: String(location || "").trim() || null,
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
          error: error.message || "Error creando clinica",
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
        error: err instanceof Error ? err.message : "Error interno",
      },
      {
        status: 500,
      }
    );
  }
}
