import { NextResponse } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";

import { createActivityLog } from "@/lib/activity";
import { filterAdminPermissions, isAdminAccessRole } from "@/lib/admin-access";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabaseAuth =
      await createServerClient();

    const {
      data: { user },
    } =
      await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { data: currentAdmin } =
      await supabaseAdmin
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (
      !currentAdmin ||
      currentAdmin.role !==
        "super_admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "");
    const accessRole = String(body.accessRole || "clinic_manager");
    const permissions = filterAdminPermissions(body.permissions);
    const clinicId = Number(body.clinicId || 0) || null;
    const specialistId = String(body.specialistId || "").trim() || null;

    if (
      !email ||
      !password ||
      !["staff", "super_admin"].includes(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, password y rol valido son obligatorios",
        },
        {
          status: 400,
        }
      );
    }

    if (role !== "super_admin" && !isAdminAccessRole(accessRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rango de acceso no valido",
        },
        {
          status: 400,
        }
      );
    }

    if (role !== "super_admin" && accessRole !== "specialist" && !clinicId) {
      return NextResponse.json(
        {
          success: false,
          error: "Selecciona la clinica asociada",
        },
        {
          status: 400,
        }
      );
    }

    if (role !== "super_admin" && accessRole === "specialist" && !specialistId) {
      return NextResponse.json(
        {
          success: false,
          error: "Selecciona el especialista asociado",
        },
        {
          status: 400,
        }
      );
    }

    if (specialistId) {
      const { data: specialist } = await supabaseAdmin
        .from("specialists")
        .select("id,clinic_id,clinic_name")
        .eq("id", specialistId)
        .maybeSingle();

      if (!specialist) {
        return NextResponse.json(
          {
            success: false,
            error: "Especialista no encontrado",
          },
          {
            status: 400,
          }
        );
      }

      if (
        clinicId &&
        specialist.clinic_id &&
        Number(specialist.clinic_id) !== Number(clinicId)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "El especialista no pertenece a la clinica asignada",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "La contrasena debe tener al menos 8 caracteres",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: createdUser,
      error: createError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
        }
      );

    if (
      createError ||
      !createdUser.user
    ) {
      return NextResponse.json(
        {
          success: false,
          error: createError,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: insertError,
    } = await supabaseAdmin
      .from("admin_users")
      .insert({
        email,
        role,
        user_id:
          createdUser.user.id,
        clinic_id: clinicId,
        specialist_id:
          role === "super_admin" || accessRole !== "specialist"
            ? null
            : specialistId,
        access_role:
          role === "super_admin"
            ? "super_admin"
            : accessRole,
        permissions,
        status: "active",
      });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);

      return NextResponse.json(
        {
          success: false,
          error: insertError,
        },
        {
          status: 500,
        }
      );
    }

    await createActivityLog({
      title:
        "Nuevo administrador agregado",

      description: `${email} fue agregado como ${role}`,
      actor: {
        userId: user.id,
        email: user.email,
        role: currentAdmin.role,
      },
      entityType: "admin_user",
      entityId: createdUser.user.id,
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
