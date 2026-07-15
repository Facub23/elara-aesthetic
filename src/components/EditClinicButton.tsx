"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import AdminEntityEditorShell from "@/components/AdminEntityEditorShell";
import { showAdminToast } from "@/components/AdminToast";
import ImageUpload from "@/components/ImageUpload";

const clinicEditorSteps = [
  { id: "identity", label: "Identidad" },
  { id: "location", label: "Ubicacion" },
  { id: "media", label: "Imagen" },
  { id: "conversion", label: "Conversion" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function EditClinicButton({ clinic }: { clinic: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState("identity");
  const [form, setForm] = useState({
    name: clinic.name || "",
    city: clinic.city || "",
    country: clinic.country || "",
    location: clinic.location || "",
    image: clinic.image || "",
    slug: clinic.slug || "",
    description: clinic.description || "",
    rating: clinic.rating || "",
    patients: clinic.patients || "",
    experience: clinic.experience || "",
    whatsapp: clinic.whatsapp || "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  function closeEditor() {
    setOpen(false);
    setActiveStep("identity");
  }

  async function saveClinic() {
    setLoading(true);

    const res = await fetch("/api/update-clinic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: clinic.id,
        ...form,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showAdminToast(data.error || "Error guardando clinica", "error");
      return;
    }

    showAdminToast("Clinica actualizada", "success");
    closeEditor();
    router.refresh();
  }

  const editor = (
    <>
      {open && (
        <AdminEntityEditorShell
          title="Editar clinica"
          steps={clinicEditorSteps}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onCancel={closeEditor}
          primaryAction={{
            label: "Guardar cambios",
            loadingLabel: "Guardando...",
            loading,
            onClick: saveClinic,
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
                    Nombre, URL y descripcion
                  </h3>
                  <div className="mt-10 grid gap-5">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name: e.target.value,
                          slug: form.slug || slugify(e.target.value),
                        })
                      }
                      placeholder="Nombre"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <input
                      value={form.slug}
                      onChange={(e) =>
                        setForm({ ...form, slug: slugify(e.target.value) })
                      }
                      placeholder="Slug"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <textarea
                      rows={8}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Descripcion"
                      className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                    />
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
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Ciudad"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <input
                      value={form.country}
                      onChange={(e) =>
                        setForm({ ...form, country: e.target.value })
                      }
                      placeholder="Pais"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <textarea
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      placeholder={"Direcciones de atencion, una por linea\nEj: Calle Serrano 45, Madrid\nEj: Avenida Diagonal 210, Barcelona"}
                      rows={5}
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

              {activeStep === "conversion" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Conversion
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Datos comerciales
                  </h3>
                  <div className="mt-10 grid gap-5">
                    {[
                      ["rating", "Rating"],
                      ["patients", "Pacientes"],
                      ["experience", "Experiencia"],
                      ["whatsapp", "WhatsApp"],
                    ].map(([key, placeholder]) => (
                      <input
                        key={key}
                        value={(form as any)[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                        placeholder={placeholder}
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-8">
              <div className="overflow-hidden rounded-[40px] border border-black/5 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <div className="relative h-[320px] overflow-hidden">
                  <img
                    src={form.image || "https://placehold.co/1200x800?text=EncuentraTuClinica"}
                    alt={form.name}
                    className="h-full w-full object-contain bg-[#F8F5F1]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/70">
                      {form.city}, {form.country}
                    </div>
                    <div className="mt-3 text-4xl font-semibold">
                      {form.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Datos de conversion
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    ["Rating", form.rating || "5.0"],
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
