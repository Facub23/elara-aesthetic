import { NextResponse } from "next/server";
import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function getClinicValidationIssue({
  id,
  name,
  city,
  country,
  image,
  location,
  slug,
  description,
}: {
  id?: string | number;
  name?: string;
  city?: string;
  country?: string;
  image?: string;
  location?: string;
  slug?: string;
  description?: string;
}) {
  if (!id) return "Falta el ID de la clinica.";
  if (!hasText(name)) return "Falta el nombre de la clinica.";
  if (!hasText(slug)) return "Falta el slug de la clinica.";
  if (!hasText(description)) return "Falta la descripcion de la clinica.";
  if (!hasText(city)) return "Falta la ciudad de la clinica.";
  if (!hasText(country)) return "Falta el pais de la clinica.";
  if (!hasText(location)) return "Falta al menos una direccion de atencion.";
  if (!hasText(image)) return "Falta subir la imagen principal de la clinica.";

  return "";
}

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!hasAdminPermission(admin, "content")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    id,
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
    id,
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

  if (admin?.role !== "super_admin" && admin?.clinicId && Number(id) !== Number(admin.clinicId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: existingClinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (existingClinic) {
    return NextResponse.json(
      { success: false, error: "Ya existe una clinica con ese slug." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("clinics")
    .update({
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
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error actualizando clinica",
      },
      {
        status: 500,
      }
    );
  }

  await createActivityLog({
    title: "Clinica actualizada",
    description: `${name} - ${city}`,
    actor: admin,
    entityType: "clinic",
    entityId: id,
  });

  return NextResponse.json({
    success: true,
  });
}
