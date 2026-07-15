import { redirect } from "next/navigation";

import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import DeleteClinicButton from "@/components/DeleteClinicButton";
import EditClinicButton from "@/components/EditClinicButton";
import AddClinicForm from "@/components/AddClinicForm";
import AdminClinicWorkspace from "@/components/AdminClinicWorkspace";
import AdminShell from "@/components/AdminShell";
import AdminPublicationChecklist from "@/components/AdminPublicationChecklist";
import { hasAnyAdminPermission, isSpecialistAccessRole } from "@/lib/admin-access";
import { getTreatmentName } from "@/lib/treatment-utils";

function hasText(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function getClinicChecklist(
  clinic: any,
  specialistCount: number,
  treatmentCount: number
) {
  return [
    {
      label: "Nombre, slug y ubicacion",
      done:
        hasText(clinic.name) &&
        hasText(clinic.slug) &&
        hasText(clinic.city) &&
        hasText(clinic.country),
      hint: "Completa identidad y ciudad para SEO local.",
    },
    {
      label: "Imagen principal",
      done: hasText(clinic.heroImage) || hasText(clinic.image),
      hint: "Sube una imagen premium.",
    },
    {
      label: "Descripcion suficiente",
      done: hasText(clinic.description) && clinic.description.length >= 100,
      hint: "Escribe al menos 100 caracteres.",
    },
    {
      label: "Especialistas asociados",
      done: specialistCount > 0,
      hint: "Asocia al menos un especialista.",
    },
    {
      label: "Tratamientos conectados",
      done: treatmentCount > 0,
      hint: "Asigna tratamientos a los especialistas de esta clinica.",
    },
    {
      label: "Datos de conversion",
      done:
        hasText(clinic.whatsapp) ||
        hasText(clinic.rating) ||
        hasText(clinic.patients),
      hint: "Anade rating, pacientes o WhatsApp.",
    },
  ];
}

export default async function AdminClinicasPage() {
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

  if (!isSuperAdmin && isSpecialistAccessRole(adminUser.access_role)) {
    redirect("/admin/sin-permiso");
  }

  if (!hasAnyAdminPermission({
    role: adminUser.role,
    accessRole: adminUser.access_role,
    permissions: adminUser.permissions,
    status: adminUser.status,
  }, ["content", "bookings", "calendar"])) {
    redirect("/admin/sin-permiso");
  }

  let clinicsQuery = supabase
    .from("clinics")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (!isSuperAdmin && adminUser.clinic_id) {
    clinicsQuery = clinicsQuery.eq("id", adminUser.clinic_id);
  }

  const { data: clinics } = await clinicsQuery;

  const { data: specialists } = await supabase
    .from("specialists")
    .select("id,name,slug,clinic_name,treatments");

  const specialistCountByClinic = new Map<string, number>();
  const treatmentNamesByClinic = new Map<string, string[]>();
  const specialistsByClinic = new Map<string, any[]>();

  clinics?.forEach((clinic) => {
    const clinicSpecialists =
      specialists?.filter(
        (specialist) => clinic.name && specialist.clinic_name === clinic.name
      ) || [];
    const treatmentNames = Array.from(
      new Set(
        clinicSpecialists.flatMap((specialist) =>
          Array.isArray(specialist.treatments)
            ? specialist.treatments.map(getTreatmentName).filter(Boolean)
            : []
        )
      )
    ).sort((a, b) => a.localeCompare(b, "es"));

    specialistCountByClinic.set(String(clinic.id), clinicSpecialists.length);
    treatmentNamesByClinic.set(String(clinic.id), treatmentNames);
    specialistsByClinic.set(String(clinic.id), clinicSpecialists);
  });

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={adminUser.access_role}
      permissions={adminUser.permissions}
      status={adminUser.status}
    >
      <div className="mx-auto max-w-7xl">
        {!isSuperAdmin && clinics?.[0] ? (
          <AdminClinicWorkspace
            clinic={clinics[0]}
            specialists={specialistsByClinic.get(String(clinics[0].id)) || []}
            treatments={treatmentNamesByClinic.get(String(clinics[0].id)) || []}
            checklistItems={getClinicChecklist(
              clinics[0],
              specialistCountByClinic.get(String(clinics[0].id)) || 0,
              treatmentNamesByClinic.get(String(clinics[0].id))?.length || 0
            )}
          />
        ) : null}

        {isSuperAdmin ? (
          <>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Clínicas
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Gestion de clinicas
            </h1>

            <p className="mt-4 max-w-2xl text-neutral-500">
              Revisa que cada clinica tenga especialistas, tratamientos
              conectados y una ficha publica lista para marketplace.
            </p>
          </div>

          {isSuperAdmin && <AddClinicForm />}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {!clinics || clinics.length === 0 ? (
            <div className="rounded-[32px] bg-white/70 p-10 text-center">
              <h2 className="text-2xl font-semibold">No hay clinicas todavia</h2>

              <p className="mt-3 text-neutral-500">
                Crea tu primera clinica desde el boton superior.
              </p>
            </div>
          ) : (
            clinics.map((clinic) => {
              const clinicKey = String(clinic.id);
              const specialistCount =
                specialistCountByClinic.get(clinicKey) || 0;
              const treatmentNames =
                treatmentNamesByClinic.get(clinicKey) || [];
              const clinicSpecialists =
                specialistsByClinic.get(clinicKey) || [];

              return (
                <div
                  key={clinic.id}
                  className="overflow-hidden rounded-[36px] border border-white/40 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
                >
                  <div className="h-[280px] w-full overflow-hidden">
                    <img
                      src={
                        clinic.image ||
                        "https://placehold.co/1200x800?text=EncuentraTuClinica"
                      }
                      alt={clinic.name}
                      className="h-full w-full object-contain bg-[#F8F5F1]"
                    />
                  </div>

                  <div className="p-8">
                    <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                      {clinic.city}, {clinic.country}
                    </div>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                      {clinic.name}
                    </h2>

                    <p className="mt-4 line-clamp-3 text-neutral-600">
                      {clinic.description}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#F8F5F1] p-4">
                        <div className="text-2xl font-semibold">
                          {specialistCount}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                          Especialistas
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#F8F5F1] p-4">
                        <div className="text-2xl font-semibold">
                          {treatmentNames.length}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                          Tratamientos
                        </div>
                      </div>
                    </div>

                    {treatmentNames.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {treatmentNames.slice(0, 5).map((treatmentName) => (
                          <span
                            key={treatmentName}
                            className="rounded-full bg-[#F3EFE9] px-3 py-2 text-xs"
                          >
                            {treatmentName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                        Esta clinica todavia no aparece para tratamientos:
                        asigna tratamientos a sus especialistas.
                      </div>
                    )}

                    {clinicSpecialists.length > 0 && (
                      <div className="mt-5 rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                          Especialistas vinculados
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {clinicSpecialists.slice(0, 4).map((specialist) => (
                            <a
                              key={specialist.id}
                              href={`/especialistas/${specialist.slug}`}
                              target="_blank"
                              className="rounded-full bg-[#F3EFE9] px-3 py-2 text-xs transition hover:bg-black hover:text-white"
                            >
                              {specialist.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      <AdminPublicationChecklist
                        items={getClinicChecklist(
                          clinic,
                          specialistCount,
                          treatmentNames.length
                        )}
                      />
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <a
                        href={`/clinics/${clinic.slug}`}
                        target="_blank"
                        className="rounded-full bg-black px-5 py-3 text-sm text-white"
                      >
                        Ver clinica
                      </a>

                      <a
                        href={`/tratamientos?clinic=${clinic.slug}`}
                        target="_blank"
                        className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
                      >
                        Ver tratamientos
                      </a>

                      <a
                        href={`/especialistas?clinic=${clinic.slug}`}
                        target="_blank"
                        className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
                      >
                        Ver especialistas
                      </a>

                      {isSuperAdmin && (
                        <>
                          <a
                            href={`/admin/especialistas?clinic=${encodeURIComponent(
                              clinic.name
                            )}&new=1`}
                            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
                          >
                            Crear especialista
                          </a>

                          <EditClinicButton clinic={clinic} />

                          <DeleteClinicButton clinicId={clinic.id} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
          </>
        ) : !clinics?.[0] ? (
          <div className="rounded-[32px] bg-white/70 p-10 text-center">
            <h1 className="text-3xl font-semibold">
              No tienes una clinica asignada
            </h1>
            <p className="mt-3 text-neutral-500">
              Pide a un superadmin que asigne tu usuario a una clinica.
            </p>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
