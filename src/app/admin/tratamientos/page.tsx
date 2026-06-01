import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/AdminShell";
import AdminTreatmentsManager from "@/components/AdminTreatmentsManager";

export default async function AdminTreatmentsPage() {
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

  if (!isSuperAdmin) {
    redirect("/admin");
  }

  const [{ data: treatments }, { data: specialists }, { data: durations }] =
    await Promise.all([
      supabase
        .from("treatments")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
      supabase.from("specialists").select("id,clinic_name,treatments"),
      supabase
        .from("treatment_durations")
        .select("treatment_name,duration_minutes"),
    ]);

  return (
    <AdminShell isSuperAdmin={isSuperAdmin}>
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Tratamientos
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Gestion de tratamientos
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-500">
          Crea, edita y elimina tratamientos visibles en la web publica.
        </p>

        <AdminTreatmentsManager
          initialTreatments={treatments || []}
          specialists={specialists || []}
          durations={durations || []}
        />
      </div>
    </AdminShell>
  );
}
