import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { getAssignedClinicName, isSpecialistAdmin } from "@/lib/admin-scope";
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

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const independentSpecialistAdmin =
    isSpecialistAdmin(admin) && admin.accessRole === "independent_specialist";

  if (!hasAdminPermission(admin, "content") && !independentSpecialistAdmin) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const {
      id,
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
      !id ||
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
        {
          status: 400,
        }
      );
    }

    const { data: currentSpecialist, error: currentSpecialistError } =
      await supabase
        .from("specialists")
        .select("id,name,clinic_id,clinic_name")
        .eq("id", id)
        .maybeSingle();

    if (currentSpecialistError) {
      return NextResponse.json(
        { success: false, error: currentSpecialistError.message },
        { status: 500 }
      );
    }

    if (!currentSpecialist) {
      return NextResponse.json(
        { success: false, error: "Especialista no encontrado" },
        { status: 404 }
      );
    }

    if (
      independentSpecialistAdmin &&
      String(admin.specialistId || "") !== String(currentSpecialist.id)
    ) {
      return NextResponse.json(
        { success: false, error: "No puedes editar otro especialista" },
        { status: 403 }
      );
    }

    if (independentSpecialistAdmin && clinic_name) {
      return NextResponse.json(
        {
          success: false,
          error: "Los especialistas independientes deben usar direccion de consulta",
        },
        { status: 403 }
      );
    }

    const assignedClinicName = await getAssignedClinicName({
      role: admin.role,
      clinicId: admin.clinicId,
    });
    const currentSpecialistClinicMatches = Boolean(
      (admin.clinicId &&
        currentSpecialist.clinic_id &&
        String(currentSpecialist.clinic_id) === String(admin.clinicId)) ||
        currentSpecialist.clinic_name === assignedClinicName
    );

    if (assignedClinicName && !currentSpecialistClinicMatches) {
      return NextResponse.json(
        { success: false, error: "No puedes editar especialistas de otra clinica" },
        { status: 403 }
      );
    }

    if (assignedClinicName && assignedClinicName !== clinic_name) {
      return NextResponse.json(
        { success: false, error: "No puedes editar especialistas de otra clinica" },
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
        {
          success: false,
          error: "Selecciona una clinica existente",
        },
        {
          status: 409,
        }
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
        {
          status: 409,
        }
      );
    }

    const { error } = await supabase
      .from("specialists")
      .update({
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
      })
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
      title: "Especialista actualizado",
      description: `${name} - ${clinic?.name || "Consulta independiente"}`,
      actor: admin,
      entityType: "specialist",
      entityId: id,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err,
      },
      {
        status: 500,
      }
    );
  }
}
