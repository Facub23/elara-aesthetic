import { NextResponse } from "next/server";

import { hasAdminPermission } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { isSpecialistAdmin } from "@/lib/admin-scope";
import { supabaseAdmin } from "@/lib/supabase/admin";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const area = String(formData.get("area") || "marketplace");
  const specialistUpload = isSpecialistAdmin(admin) && area === "specialists";

  if (
    admin.role !== "super_admin" &&
    !hasAdminPermission(admin, "content") &&
    !specialistUpload
  ) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Imagen requerida" }, { status: 400 });
  }

  const extension = imageExtensions[file.type];

  if (!extension) {
    return NextResponse.json(
      { success: false, error: "Formato no permitido. Usa JPG, PNG, WEBP o AVIF." },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: "La imagen no puede superar 5 MB." },
      { status: 400 }
    );
  }

  const folder = ["clinics", "specialists", "treatments"].includes(area)
    ? area
    : "marketplace";
  const fileName = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage
    .from("clinic-images")
    .upload(fileName, Buffer.from(await file.arrayBuffer()), {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("clinic-images").getPublicUrl(fileName);

  return NextResponse.json({ success: true, url: data.publicUrl });
}
