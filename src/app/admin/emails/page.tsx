import { redirect } from "next/navigation";

import AdminEmailTemplatesManager from "@/components/AdminEmailTemplatesManager";
import AdminShell from "@/components/AdminShell";
import {
  DEFAULT_EMAIL_TEMPLATES,
  mergeEmailTemplates,
} from "@/lib/email-templates";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminEmailsPage() {
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
    redirect("/admin/sin-permiso");
  }

  const { data: savedTemplates } = await supabase
    .from("email_templates")
    .select("key,name,description,subject,title,body,cta_label,active,sort_order")
    .order("sort_order", {
      ascending: true,
    });

  const templates = mergeEmailTemplates(savedTemplates);

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Plantillas
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Plantillas automaticas
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-500">
          Edita los emails transaccionales de reservas, confirmaciones,
          cambios y recordatorios. Las variables se reemplazan automaticamente
          cuando se envia cada notificacion.
        </p>

        <AdminEmailTemplatesManager
          initialTemplates={templates}
          defaultTemplates={DEFAULT_EMAIL_TEMPLATES}
        />
      </div>
    </AdminShell>
  );
}
