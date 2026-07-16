"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import AdminEntityEditorShell from "@/components/AdminEntityEditorShell";
import { showAdminToast } from "@/components/AdminToast";
import ImageUpload from "@/components/ImageUpload";

const treatmentEditorSteps = [
  { id: "identity", label: "Identidad" },
  { id: "content", label: "Contenido" },
  { id: "media", label: "Imagen" },
];

function getTreatmentValidationIssues(form: {
  name: string;
  description: string;
  image: string;
  duration_minutes: string;
}) {
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

export default function EditTreatmentButton({
  treatment,
}: {
  treatment: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeStep, setActiveStep] = useState("identity");
  const [form, setForm] = useState({
    name: treatment.name || "",
    description: treatment.description || "",
    image: treatment.image || "",
    duration_minutes: String(treatment.duration_minutes || 60),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  function closeEditor() {
    setOpen(false);
    setActiveStep("identity");
    setActionError("");
  }

  async function saveTreatment() {
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

    setLoading(true);

    let res: Response;

    try {
      res = await fetch("/api/update-treatment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: treatment.id,
          previous_name: treatment.name,
          ...form,
        }),
      });
    } catch {
      const message = "No se pudo conectar con el servidor para guardar.";

      setLoading(false);
      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message =
        typeof data.error === "string"
          ? data.error
          : "Error guardando tratamiento";

      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    showAdminToast("Tratamiento actualizado", "success");
    closeEditor();
    router.refresh();
  }

  const editor = (
    <>
      {open && (
        <AdminEntityEditorShell
          title="Editar tratamiento"
          steps={treatmentEditorSteps}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onCancel={closeEditor}
          primaryAction={{
            label: "Guardar cambios",
            loadingLabel: "Guardando...",
            loading,
            onClick: saveTreatment,
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
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-10 h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  />

                  <label className="mt-6 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                    Duracion de la cita
                  </label>
                  <select
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: e.target.value })
                    }
                    className="mt-3 h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  >
                    {[15, 30, 45, 60, 75, 90, 120].map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} min
                      </option>
                    ))}
                  </select>
                </>
              )}

              {activeStep === "content" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Contenido
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Descripcion publica
                  </h3>
                  <textarea
                    rows={10}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="mt-10 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                  />
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
            </div>

            <div className="space-y-8">
              <div className="overflow-hidden rounded-[40px] border border-black/5 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <div className="relative h-[420px] overflow-hidden">
                  <img
                    src={form.image || "https://placehold.co/1200x800?text=EncuentraTuClinica"}
                    alt={form.name}
                    className="h-full w-full object-contain bg-[#F8F5F1]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/70">
                      Tratamiento EncuentraTuClinica
                    </div>
                    <div className="mt-3 text-5xl font-semibold">
                      {form.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Preview descripcion
                </p>
                <p className="mt-5 text-lg leading-relaxed text-neutral-600">
                  {form.description || "Descripcion del tratamiento..."}
                </p>
                <div className="mt-5 rounded-2xl bg-[#F8F5F1] p-4 text-sm font-medium">
                  Duracion para reservas: {form.duration_minutes} min
                </div>
              </div>
            </div>
          </div>
        </AdminEntityEditorShell>
      )}
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
      >
        Editar
      </button>

      {mounted ? createPortal(editor, document.body) : null}
    </>
  );
}
