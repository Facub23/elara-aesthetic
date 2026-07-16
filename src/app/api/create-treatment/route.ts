import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

function canManageGlobalContent(admin: Awaited<ReturnType<typeof getAdminRequestContext>>) {
  return admin?.role === "super_admin" || admin?.accessRole === "content_editor";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function saveTreatmentDuration(name: string, durationMinutes: number) {
  const { data: existingDuration } = await supabase
    .from("treatment_durations")
    .select("id")
    .ilike("treatment_name", name)
    .maybeSingle();

  if (existingDuration?.id) {
    await supabase
      .from("treatment_durations")
      .update({
        treatment_name: name,
        duration_minutes: durationMinutes,
      })
      .eq("id", existingDuration.id);
    return;
  }

  await supabase.from("treatment_durations").insert({
    treatment_name: name,
    duration_minutes: durationMinutes,
  });
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function getTreatmentValidationIssue({
  name,
  description,
  image,
  duration_minutes,
}: {
  name?: string;
  description?: string;
  image?: string;
  duration_minutes?: string | number;
}) {
  const duration = Number(duration_minutes);

  if (!hasText(name)) return "Falta el nombre del tratamiento.";
  if (!hasText(description)) return "Falta la descripcion del tratamiento.";
  if (!hasText(image)) return "Falta subir la imagen principal del tratamiento.";
  if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
    return "La duracion del tratamiento debe estar entre 5 y 240 minutos.";
  }

  return "";
}

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!hasAdminPermission(admin, "content") || !canManageGlobalContent(admin)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const { name, description, image, duration_minutes } = body;

    const validationIssue = getTreatmentValidationIssue({
      name,
      description,
      image,
      duration_minutes,
    });

    if (validationIssue) {
      return NextResponse.json(
        {
          success: false,
          error: validationIssue,
        },
        {
          status: 400,
        }
      );
    }

    const durationMinutes = Number(duration_minutes);
    const slug = slugify(name);
    const { data: existingTreatment } = await supabase
      .from("treatments")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingTreatment) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un tratamiento con ese nombre",
        },
        {
          status: 409,
        }
      );
    }

    const { data: treatment, error } = await supabase
      .from("treatments")
      .insert({
        name,
        slug,
        description,
        image,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Error creando tratamiento",
        },
        {
          status: 500,
        }
      );
    }

    await saveTreatmentDuration(name, durationMinutes);

    await createActivityLog({
      title: "Tratamiento creado",
      description: `${name} - ${durationMinutes} min`,
      actor: admin,
      entityType: "treatment",
      entityId: treatment.id,
    });

    return NextResponse.json({
      success: true,
      treatment,
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
