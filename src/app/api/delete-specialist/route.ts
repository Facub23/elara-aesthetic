import { NextResponse } from "next/server";

import { createActivityLog } from "@/lib/activity";
import { getAdminRequestContext } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = await getAdminRequestContext();

  if (admin?.role !== "super_admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("specialists")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    await createActivityLog({
      title: "Especialista eliminado",
      description: `Especialista #${id} eliminado`,
      actor: admin,
      entityType: "specialist",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err },
      { status: 500 }
    );
  }
}
