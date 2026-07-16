"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AdminEntityEditorShell from "@/components/AdminEntityEditorShell";
import AdminPublicationChecklist from "@/components/AdminPublicationChecklist";
import ConfirmDialog from "@/components/ConfirmDialog";
import EditTreatmentButton from "@/components/EditTreatmentButton";
import ImageUpload from "@/components/ImageUpload";
import { showAdminToast } from "@/components/AdminToast";
import { getTreatmentName } from "@/lib/treatment-utils";

const treatmentEditorSteps = [
  { id: "identity", label: "Identidad" },
  { id: "content", label: "Contenido" },
  { id: "media", label: "Imagen" },
  { id: "review", label: "Revision" },
];

function emptyForm() {
  return {
    name: "",
    description: "",
    image: "",
    duration_minutes: "60",
  };
}

function getTreatmentValidationIssues(form: ReturnType<typeof emptyForm>) {
  const issues: Array<{ step: string; message: string }> = [];

  if (!form.name.trim()) issues.push({ step: "identity", message: "Falta el nombre del tratamiento." });
  if (
    !Number.isFinite(Number(form.duration_minutes)) ||
    Number(form.duration_minutes) < 5 ||
    Number(form.duration_minutes) > 240
  ) {
    issues.push({ step: "identity", message: "La duracion debe estar entre 5 y 240 minutos." });
  }
  if (!form.description.trim()) issues.push({ step: "content", message: "Falta la descripcion del tratamiento." });
  if (!form.image.trim()) issues.push({ step: "media", message: "Falta subir la imagen principal." });

  return issues;
}

function getDurationForTreatment(
  treatmentName: string,
  durations: Array<{ treatment_name?: string | null; duration_minutes?: number | null }>
) {
  const match = durations.find(
    (duration) =>
      duration.treatment_name?.toLowerCase().trim() ===
      treatmentName.toLowerCase().trim()
  );

  return match?.duration_minutes || 60;
}

export default function AdminTreatmentsManager({
  initialTreatments,
  specialists = [],
  durations = [],
}: {
  initialTreatments: any[];
  specialists?: any[];
  durations?: Array<{
    treatment_name?: string | null;
    duration_minutes?: number | null;
  }>;
}) {
  const router = useRouter();
  const [treatments, setTreatments] = useState(initialTreatments);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeStep, setActiveStep] = useState("identity");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function resetEditor() {
    setOpen(false);
    setActiveStep("identity");
    setActionError("");
    setForm(emptyForm());
  }

  function getTreatmentSpecialistCount(treatmentName: string) {
    return specialists.filter((specialist) =>
      specialist.treatments?.some((treatment: any) => {
        const name = getTreatmentName(treatment);

        return name?.toLowerCase().trim() === treatmentName.toLowerCase().trim();
      })
    ).length;
  }

  function getTreatmentClinicNames(treatmentName: string) {
    return Array.from(
      new Set(
        specialists
          .filter((specialist) =>
            specialist.treatments?.some((treatment: any) => {
              const name = getTreatmentName(treatment);

              return name?.toLowerCase().trim() === treatmentName.toLowerCase().trim();
            })
          )
          .map((specialist) => specialist.clinic_name)
          .filter(Boolean)
      )
    );
  }

  function getTreatmentChecklist(treatment: any) {
    const specialistCount = treatment.name
      ? getTreatmentSpecialistCount(treatment.name)
      : 0;

    return [
      {
        label: "Nombre del tratamiento",
        done: Boolean(treatment.name?.trim()),
        hint: "Define un nombre claro y buscable.",
      },
      {
        label: "Descripcion marketplace",
        done:
          Boolean(treatment.description?.trim()) &&
          treatment.description.length >= 80,
        hint: "Escribe al menos 80 caracteres para SEO y conversion.",
      },
      {
        label: "Imagen principal",
        done: Boolean(treatment.image?.trim()),
        hint: "Sube una imagen usable en ficha publica.",
      },
      {
        label: "Especialistas asociados",
        done: specialistCount > 0,
        hint: "Asigna este tratamiento a especialistas.",
      },
      {
        label: "Duracion real",
        done:
          Number(
            treatment.duration_minutes ||
              getDurationForTreatment(treatment.name || form.name, durations)
          ) >= 5,
        hint: "Define la duracion para reservas y calendario.",
      },
    ];
  }

  async function createTreatment() {
    setActionError("");
    const issues = getTreatmentValidationIssues(form);

    if (issues.length > 0) {
      const message =
        issues.length === 1
          ? issues[0].message
          : `${issues[0].message} Hay ${issues.length - 1} punto(s) mas por revisar.`;

      setActionError(message);
      setActiveStep(issues[0].step);
      showAdminToast(message, "error");
      return;
    }

    if (
      treatments.some(
        (treatment) =>
          treatment.name?.toLowerCase().trim() === form.name.toLowerCase().trim()
      )
    ) {
      const message = "Ya existe un tratamiento con ese nombre";

      setActionError(message);
      setActiveStep("identity");
      showAdminToast(message, "error");
      return;
    }

    setLoading(true);

    let res: Response;

    try {
      res = await fetch("/api/create-treatment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
    } catch {
      const message = "No se pudo conectar con el servidor para crear.";

      setLoading(false);
      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      const message =
        typeof data.error === "string" ? data.error : "Error creando tratamiento";

      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    showAdminToast("Tratamiento creado correctamente", "success");
    setTreatments((prev) => [data.treatment || form, ...prev]);
    resetEditor();
    router.refresh();
  }

  async function deleteTreatment() {
    if (!deleteId) return;

    const idToDelete = deleteId;

    const res = await fetch("/api/delete-treatment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: idToDelete,
      }),
    });

    if (!res.ok) {
      showAdminToast("Error eliminando tratamiento", "error");
      return;
    }

    showAdminToast("Tratamiento eliminado", "success");
    setTreatments((prev) => prev.filter((item) => item.id !== idToDelete));
    setDeleteId(null);
  }

  return (
    <div className="mt-10">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-black px-6 py-3 text-white transition-all duration-300 hover:scale-[1.03]"
        >
          Nuevo tratamiento
        </button>
      </div>

      {open && (
        <AdminEntityEditorShell
          title="Nuevo tratamiento"
          steps={treatmentEditorSteps}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onCancel={resetEditor}
          primaryAction={{
            label: "Crear tratamiento",
            loadingLabel: "Creando...",
            loading,
            onClick: createTreatment,
          }}
        >
          {actionError && (
            <div className="mx-auto mt-6 max-w-7xl px-6">
              <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                {actionError}
              </div>
            </div>
          )}

          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
              {activeStep === "identity" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Identidad
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Nombre del tratamiento
                  </h3>

                  <div className="mt-10">
                    <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                      Nombre
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                  </div>

                  <div className="mt-5">
                    <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                      Duracion de la cita
                    </label>
                    <select
                      value={form.duration_minutes}
                      onChange={(e) =>
                        setForm({ ...form, duration_minutes: e.target.value })
                      }
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    >
                      {[15, 30, 45, 60, 75, 90, 120].map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} min
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeStep === "content" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Contenido marketplace
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Descripcion publica
                  </h3>

                  <div className="mt-10">
                    <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                      Descripcion
                    </label>
                    <textarea
                      rows={10}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                    />
                  </div>
                </>
              )}

              {activeStep === "media" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Imagen
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Imagen principal
                  </h3>

                  <div className="mt-10">
                    <ImageUpload
                      value={form.image}
                      onChange={(url) => setForm({ ...form, image: url })}
                    />
                  </div>
                </>
              )}

              {activeStep === "review" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Revision
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Listo para crear
                  </h3>
                  <p className="mt-5 leading-7 text-neutral-600">
                    Este tratamiento empieza a rendir en marketplace cuando
                    tiene buena descripcion, imagen y especialistas asociados.
                  </p>

                  <div className="mt-6 rounded-[24px] bg-[#F8F5F1] p-5 text-sm leading-6 text-neutral-600">
                    Despues de crearlo, asignalo a uno o mas especialistas desde
                    el admin de especialistas para que aparezca dentro de las
                    clinicas correspondientes.
                  </div>
                </>
              )}
            </div>

            <div className="space-y-8">
              <div className="overflow-hidden rounded-[40px] border border-black/5 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <div className="relative h-[320px] overflow-hidden">
                  <img
                    src={form.image || "https://placehold.co/1200x800?text=EncuentraTuClinica"}
                    alt={form.name || "Nuevo tratamiento"}
                    className="h-full w-full object-contain bg-[#F8F5F1]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/70">
                      Tratamiento EncuentraTuClinica
                    </div>
                    <div className="mt-3 text-4xl font-semibold">
                      {form.name || "Nuevo tratamiento"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Preview
                </p>
                <p className="mt-6 text-lg leading-relaxed text-neutral-600">
                  {form.description || "La descripcion del tratamiento aparecera aqui."}
                </p>
                <div className="mt-5 rounded-2xl bg-[#F8F5F1] p-4 text-sm font-medium">
                  Duracion para reservas: {form.duration_minutes} min
                </div>
              </div>

              <AdminPublicationChecklist items={getTreatmentChecklist(form)} />
            </div>
          </div>
        </AdminEntityEditorShell>
      )}

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {treatments.map((treatment) => (
          <div
            key={treatment.id}
            className="overflow-hidden rounded-[36px] bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]"
          >
            <div className="h-[240px] overflow-hidden">
              <img
                src={
                  treatment.image ||
                  "https://placehold.co/1200x800?text=EncuentraTuClinica"
                }
                alt={treatment.name}
                className="h-full w-full object-contain bg-[#F8F5F1]"
              />
            </div>

            <div className="p-7">
              <h2 className="text-3xl font-semibold">{treatment.name}</h2>
              <p className="mt-4 line-clamp-3 text-neutral-500">
                {treatment.description}
              </p>

              <div className="mt-4 inline-flex rounded-full bg-[#F3EFE9] px-4 py-2 text-sm font-medium">
                {getDurationForTreatment(treatment.name, durations)} min
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F8F5F1] p-4">
                  <div className="text-2xl font-semibold">
                    {getTreatmentSpecialistCount(treatment.name)}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Especialistas
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F8F5F1] p-4">
                  <div className="text-2xl font-semibold">
                    {getTreatmentClinicNames(treatment.name).length}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Clinicas
                  </div>
                </div>
              </div>

              {getTreatmentClinicNames(treatment.name).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {getTreatmentClinicNames(treatment.name)
                    .slice(0, 3)
                    .map((clinicName) => (
                      <span
                        key={clinicName}
                        className="rounded-full bg-[#F3EFE9] px-3 py-2 text-xs"
                      >
                        {clinicName}
                      </span>
                    ))}
                </div>
              )}

              <div className="mt-6">
                <AdminPublicationChecklist
                  items={getTreatmentChecklist(treatment)}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {treatment.slug && (
                  <a
                    href={`/tratamientos/${treatment.slug}`}
                    target="_blank"
                    className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
                  >
                    Ver publico
                  </a>
                )}

                <EditTreatmentButton
                  treatment={{
                    ...treatment,
                    duration_minutes: getDurationForTreatment(
                      treatment.name,
                      durations
                    ),
                  }}
                />

                <button
                  onClick={() => setDeleteId(treatment.id)}
                  className="rounded-full bg-red-500 px-5 py-3 text-sm text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar tratamiento"
        description="Esta accion eliminara el tratamiento permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={deleteTreatment}
      />
    </div>
  );
}
