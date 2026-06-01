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

export default function EditTreatmentButton({
  treatment,
}: {
  treatment: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
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
  }

  async function saveTreatment() {
    setLoading(true);

    const res = await fetch("/api/update-treatment", {
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

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showAdminToast(data.error || "Error guardando tratamiento", "error");
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
                    className="h-full w-full object-cover"
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
