import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/AdminShell";
import { getAccessRoleLabel, isSpecialistAccessRole } from "@/lib/admin-access";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getPrimaryAdminPath(accessRole?: string | null) {
  if (isSpecialistAccessRole(accessRole)) return "/admin/calendar";
  if (
    accessRole === "clinic_owner" ||
    accessRole === "clinic_manager" ||
    accessRole === "reception"
  ) {
    return "/admin/clinicas";
  }

  if (accessRole === "content_editor") return "/admin/tratamientos";
  if (accessRole === "finance") return "/admin/finanzas";

  return "/admin";
}

export default async function AdminForbiddenPage() {
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    redirect("/login");
  }

  const isSuperAdmin = adminUser.role === "super_admin";
  const roleLabel = isSuperAdmin
    ? "Superadmin"
    : getAccessRoleLabel(adminUser.access_role);
  const primaryPath = getPrimaryAdminPath(adminUser.access_role);

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center">
        <div className="w-full rounded-[36px] border border-black/5 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-12">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Acceso limitado
          </p>

          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Esta seccion no esta disponible para tu rol.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-500">
            Tu rango actual es {roleLabel}. El panel solo muestra y permite
            operar las areas asociadas a ese acceso para proteger los datos de
            clinicas, especialistas y pacientes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryPath}
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Ir a mi area
            </Link>

            <Link
              href="/api/logout"
              prefetch={false}
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium transition hover:border-black"
            >
              Cambiar usuario
            </Link>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
