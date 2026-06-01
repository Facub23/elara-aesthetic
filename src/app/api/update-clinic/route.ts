import { NextResponse } from "next/server";
import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

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
    slug,
    description,
    rating,
    patients,
    experience,
    whatsapp,
  } = body;

  if (admin?.role !== "super_admin" && admin?.clinicId && Number(id) !== Number(admin.clinicId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("clinics")
    .update({
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
