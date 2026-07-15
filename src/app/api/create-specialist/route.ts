import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { getAssignedClinicName } from "@/lib/admin-scope";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getTreatmentName } from "@/lib/treatment-utils";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeSelectedTreatments(treatments: unknown) {
  if (!Array.isArray(treatments)) {
    return [];
  }

  return treatments
    .map((treatment) => {
      const name = getTreatmentName(treatment as any).trim();
      const price =
        typeof treatment === "object" && treatment !== null
          ? String((treatment as any).price || "").trim()
          : "";
      const duration =
        typeof treatment === "object" && treatment !== null
          ? Number(
              String(
                (treatment as any).duration_minutes ||
                  (treatment as any).durationMinutes ||
                  ""
              ).replace(/[^0-9]/g, "")
            )
          : 0;

      if (!name) {
        return null;
      }

      return { name, price, duration_minutes: duration || null };
    })
    .filter(Boolean) as Array<{
      name: string;
      price?: string;
      duration_minutes?: number | null;
    }>;
}

function hasIncompleteTreatmentConfig(
  treatments: Array<{
    name: string;
    price?: string;
    duration_minutes?: number | null;
  }>
) {
  return treatments.some(
    (treatment) =>
      !String(treatment.price || "").trim() ||
      !treatment.duration_minutes ||
      treatment.duration_minutes < 5 ||
      treatment.duration_minutes > 240
  );
}

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!hasAdminPermission(admin, "content")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      name,
      specialty,
      clinic_name,
      consultation_address,
      image,
      bio,
      treatments,
      rating,
      reviews_count,
    } = body;

    const selectedTreatments = normalizeSelectedTreatments(treatments);

    if (
      !name ||
      !specialty ||
      !image ||
      !bio ||
      selectedTreatments.length === 0 ||
      hasIncompleteTreatmentConfig(selectedTreatments)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Completa nombre, imagen, bio, precio y duracion valida para cada tratamiento",
        },
        { status: 400 }
      );
    }

    const assignedClinicName = await getAssignedClinicName({
      role: admin.role,
      clinicId: admin.clinicId,
    });

    if (assignedClinicName && assignedClinicName !== clinic_name) {
      return NextResponse.json(
        { success: false, error: "No puedes crear especialistas para otra clinica" },
        { status: 403 }
      );
    }

    const [{ data: clinic }, { data: catalogTreatments }] = await Promise.all([
      clinic_name
        ? supabase.from("clinics").select("id,name").eq("name", clinic_name).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("treatments").select("name"),
    ]);

    if (clinic_name && !clinic) {
      return NextResponse.json(
        { success: false, error: "Selecciona una clinica existente" },
        { status: 409 }
      );
    }

    const validTreatments = new Set(
      (catalogTreatments || []).map((treatment) =>
        normalize(treatment.name || "")
      )
    );
    const invalidTreatments = selectedTreatments.filter(
      (treatment) => !validTreatments.has(normalize(treatment.name))
    );

    if (invalidTreatments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tratamientos no encontrados: ${invalidTreatments
            .map((treatment) => treatment.name)
            .join(", ")}`,
        },
        { status: 409 }
      );
    }

    const specialistPayload = {
      name,
      slug: slugify(name),
      specialty,
      clinic_id: clinic?.id || null,
      clinic_name: clinic?.name || null,
      consultation_address: String(consultation_address || "").trim() || null,
      image,
      bio,
      treatments: selectedTreatments,
      rating: Number(rating) || 5,
      reviews_count: Number(reviews_count) || 0,
    };

    const { data: specialist, error } = await supabase
      .from("specialists")
      .insert(specialistPayload)
      .select("id,name,slug")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "Error creando especialista" },
        { status: 500 }
      );
    }

    await createActivityLog({
      title: "Especialista creado",
      description: `${name} - ${clinic?.name || "Consulta independiente"}`,
      actor: admin,
      entityType: "specialist",
      entityId: specialist.id,
    });

    return NextResponse.json({
      success: true,
      specialist,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
