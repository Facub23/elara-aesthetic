import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
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

      if (!name) {
        return null;
      }

      return price ? { name, price } : { name };
    })
    .filter(Boolean) as Array<{ name: string; price?: string }>;
}

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (admin?.role !== "super_admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const {
      name,
      specialty,
      clinic_name,
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
      !clinic_name ||
      !image ||
      !bio ||
      selectedTreatments.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Completa nombre, clinica, imagen, bio y al menos un tratamiento",
        },
        { status: 400 }
      );
    }

    const [{ data: clinic }, { data: catalogTreatments }] = await Promise.all([
      supabase.from("clinics").select("id,name").eq("name", clinic_name).maybeSingle(),
      supabase.from("treatments").select("name"),
    ]);

    if (!clinic) {
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
      clinic_id: clinic.id,
      clinic_name,
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
        { success: false, error },
        { status: 500 }
      );
    }

    await createActivityLog({
      title: "Especialista creado",
      description: `${name} - ${clinic_name}`,
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
      { success: false, error: err },
      { status: 500 }
    );
  }
}
