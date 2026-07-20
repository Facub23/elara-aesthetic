"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import AdminEntityEditorShell from "@/components/AdminEntityEditorShell";
import AdminPublicationChecklist from "@/components/AdminPublicationChecklist";
import ImageUpload from "@/components/ImageUpload";
import { showAdminToast } from "@/components/AdminToast";

const clinicEditorSteps = [
  { id: "identity", label: "Identidad" },
  { id: "location", label: "Ubicacion" },
  { id: "media", label: "Imagen" },
  { id: "conversion", label: "Conversion" },
  { id: "review", label: "Revision" },
];

function emptyForm() {
  return {
    name: "",
    city: "",
    country: "",
    location: "",
    image: "",
    slug: "",
    description: "",
    rating: "",
    patients: "",
    experience: "",
    whatsapp: "",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getClinicValidationIssues(form: ReturnType<typeof emptyForm>) {
  const issues: Array<{ step: string; message: string }> = [];

  if (!form.name.trim()) issues.push({ step: "identity", message: "Falta el nombre de la clinica." });
  if (!form.slug.trim()) issues.push({ step: "identity", message: "Falta el slug de la clinica." });
  if (!form.description.trim()) issues.push({ step: "identity", message: "Falta la descripcion." });
  if (!form.city.trim()) issues.push({ step: "location", message: "Falta la ciudad." });
  if (!form.country.trim()) issues.push({ step: "location", message: "Falta el pais." });
  if (!form.location.trim()) {
    issues.push({ step: "location", message: "Falta al menos una direccion de atencion." });
  }
  if (!form.image.trim()) issues.push({ step: "media", message: "Falta subir la imagen principal." });

  return issues;
}

export default function AddClinicForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeStep, setActiveStep] = useState("identity");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setMounted(true);
  }, []);

  function resetEditor() {
    setOpen(false);
    setActiveStep("identity");
    setActionError("");
    setForm(emptyForm());
  }

  function getClinicChecklist() {
    return [
      {
        label: "Nombre y slug",
        done: Boolean(form.name.trim()) && Boolean(form.slug.trim()),
        hint: "Define nombre y URL publica.",
      },
      {
        label: "Ciudad y direcciones",
        done:
          Boolean(form.city.trim()) &&
          Boolean(form.country.trim()) &&
          Boolean(form.location.trim()),
        hint: "Completa ciudad y una o mas direcciones de atencion.",
      },
      {
        label: "Imagen principal",
        done: Boolean(form.image.trim()),
        hint: "Sube una imagen premium.",
      },
      {
        label: "Descripcion suficiente",
        done: Boolean(form.description.trim()) && form.description.length >= 100,
        hint: "Escribe al menos 100 caracteres.",
      },
      {
        label: "Datos de conversion",
        done:
          Boolean(form.whatsapp.trim()) ||
          Boolean(form.rating.trim()) ||
          Boolean(form.patients.trim()),
        hint: "Añade WhatsApp, rating o pacientes.",
      },
    ];
  }

  async function createClinic() {
    setActionError("");
    const issues = getClinicValidationIssues(form);

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
      res = await fetch("/api/create-clinic", {
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

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message =
        typeof data.error === "string" ? data.error : "Error creando clinica";

      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    showAdminToast("Clinica creada correctamente", "success");
    resetEditor();
    router.refresh();
  }

  const editor = (
    <>
      {open && (
        <AdminEntityEditorShell
          title="Nueva clinica"
          steps={clinicEditorSteps}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onCancel={resetEditor}
          primaryAction={{
            label: "Crear clinica",
            loadingLabel: "Creando...",
            loading,
            onClick: createClinic,
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
                    Nombre y URL publica
                  </h3>

                  <div className="mt-10 grid gap-5">
                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Nombre
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            name: e.target.value,
                            slug: form.slug || slugify(e.target.value),
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Slug
                      </label>
                      <input
                        value={form.slug}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            slug: slugify(e.target.value),
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Descripcion
                      </label>
                      <textarea
                        rows={8}
                        value={form.description}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeStep === "location" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Ubicacion
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Ciudad y pais
                  </h3>

                  <div className="mt-10 grid gap-5">
                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Ciudad
                      </label>
                      <input
                        value={form.city}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            city: e.target.value,
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Pais
                      </label>
                      <input
                        value={form.country}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            country: e.target.value,
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Direcciones de atencion
                      </label>
                      <textarea
                        value={form.location}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            location: e.target.value,
                          })
                        }
                        placeholder={"Una direccion por linea\nEj: Calle Serrano 45, Madrid\nEj: Avenida Diagonal 210, Barcelona"}
                        rows={5}
                        className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                      />
                    </div>
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
                      onChange={(url) =>
                        setForm({
                          ...form,
                          image: url,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {activeStep === "conversion" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Conversion
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Señales comerciales
                  </h3>

                  <div className="mt-10 grid gap-5">
                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Pacientes
                      </label>
                      <input
                        value={form.patients}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            patients: e.target.value,
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Experiencia
                      </label>
                      <input
                        value={form.experience}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            experience: e.target.value,
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        WhatsApp
                      </label>
                      <input
                        value={form.whatsapp}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            whatsapp: e.target.value,
                          })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeStep === "review" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Revision
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Lista para crear
                  </h3>
                  <p className="mt-5 leading-7 text-neutral-600">
                    La clinica empezara a aparecer con fuerza en marketplace
                    cuando tenga especialistas asociados, tratamientos y datos
                    de conversion suficientes.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-8">
              <div className="overflow-hidden rounded-[40px] border border-black/5 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
                <div className="relative h-[320px] overflow-hidden">
                  <img
                    src={form.image || "https://placehold.co/1200x800?text=EncuentraTuClinica"}
                    alt={form.name || "Nueva clinica"}
                    className="h-full w-full object-contain bg-[#F8F5F1]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/70">
                      {form.city || "Ciudad"}, {form.country || "Pais"}
                    </div>
                    <div className="mt-3 text-4xl font-semibold">
                      {form.name || "Nueva clinica"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Datos de conversion
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    ["Pacientes", form.patients || "500+"],
                    ["Experiencia", form.experience || "10 anos"],
                    ["WhatsApp", form.whatsapp || "Pendiente"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-[#F8F5F1] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {label}
                      </div>
                      <div className="mt-2 font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <AdminPublicationChecklist items={getClinicChecklist()} />
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
        className="rounded-full bg-black px-6 py-3 text-white transition-all duration-300 hover:scale-[1.03]"
      >
        Nueva clinica
      </button>

      {mounted ? createPortal(editor, document.body) : null}
    </>
  );
}
