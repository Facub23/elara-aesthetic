import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AddAdminForm from "@/components/AddAdminForm";
import AdminAccessRequestsManager from "@/components/AdminAccessRequestsManager";
import AdminShell from "@/components/AdminShell";
import AdminsRealtimeList from "@/components/AdminsRealtimeList";

export default async function AdminUsersPage() {
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

  if (adminUser.role !== "super_admin") {
    redirect("/admin");
  }

  const [{ data: admins }, { data: accessRequests }, { data: clinics }, { data: specialists }] =
    await Promise.all([
      supabase
        .from("admin_users")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("admin_access_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("clinics")
        .select("id,name,city")
        .order("name", {
          ascending: true,
        }),
      supabase
        .from("specialists")
        .select("id,name,clinic_id,clinic_name")
        .order("name", {
          ascending: true,
        }),
    ]);

  return (
    <AdminShell
      isSuperAdmin={true}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Equipo
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Gestión de equipo
        </h1>

        <div className="mt-10">
          <AddAdminForm />
        </div>

        <div className="mt-12 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Accesos pendientes
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Solicitudes de clinicas y equipo
              </h2>
            </div>

            <div className="rounded-full bg-black px-5 py-2.5 text-sm text-white">
              {accessRequests?.length || 0} pendientes
            </div>
          </div>

          <div className="mt-8">
            <AdminAccessRequestsManager
              initialRequests={accessRequests || []}
              clinics={clinics || []}
              specialists={specialists || []}
            />
          </div>
        </div>

        <div className="mt-12 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Usuarios admin
          </p>

          <div className="mt-8">
            <AdminsRealtimeList
              initialAdmins={admins || []}
              currentAdminId={String(adminUser.id)}
              specialists={specialists || []}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
