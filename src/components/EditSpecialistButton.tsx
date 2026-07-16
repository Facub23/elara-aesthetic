"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import AdminEntityEditorShell from "@/components/AdminEntityEditorShell";
import { showAdminToast } from "@/components/AdminToast";
import ImageUpload from "@/components/ImageUpload";
import {
  getTreatmentName,
  getTreatmentRawDuration,
  getTreatmentRawPrice,
} from "@/lib/treatment-utils";

const specialistEditorSteps = [
  { id: "profile", label: "Perfil" },
  { id: "clinic", label: "Clinica" },
  { id: "treatments", label: "Tratamientos" },
  { id: "metrics", label: "Metricas" },
];

function hasText(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function getTreatmentPriceValue(
  treatment: string | { price?: string | number | null }
) {
  return getTreatmentRawPrice(treatment);
}

function getTreatmentDurationValue(
  treatment:
    | string
    | {
        duration_minutes?: string | number | null;
        durationMinutes?: string | number | null;
      }
) {
  return getTreatmentRawDuration(treatment);
}

function getTreatmentPriceOptions(treatment: any) {
  return Array.isArray(treatment?.price_options)
    ? treatment.price_options
    : Array.isArray(treatment?.priceOptions)
      ? treatment.priceOptions
      : [];
}

function hasCompleteTreatmentConfig(treatments: any[]) {
  return treatments.length > 0
    ? treatments.every(
        (treatment) =>
          getTreatmentRawPrice(treatment).trim().length > 0 &&
          getTreatmentRawDuration(treatment).trim().length > 0 &&
          getTreatmentPriceOptions(treatment).every(
            (option: any) =>
              String(option?.label || "").trim().length > 0 &&
              String(option?.price || "").trim().length > 0
          )
      )
    : false;
}

function getValidationIssues(form: {
  name: string;
  specialty: string;
  clinic_name: string;
  consultation_address: string;
  image: string;
  bio: string;
  treatments: any[];
}) {
  const issues: Array<{ step: string; message: string }> = [];

  if (!hasText(form.name)) {
    issues.push({ step: "profile", message: "Falta el nombre del especialista." });
  }

  if (!hasText(form.specialty)) {
    issues.push({ step: "profile", message: "Falta la especialidad." });
  }

  if (!hasText(form.image)) {
    issues.push({ step: "profile", message: "Falta subir la imagen del especialista." });
  }

  if (!hasText(form.bio)) {
    issues.push({ step: "profile", message: "Falta completar la biografia." });
  }

  if (!hasText(form.clinic_name) && !hasText(form.consultation_address)) {
    issues.push({
      step: "clinic",
      message:
        "Si es consulta independiente, falta indicar al menos una direccion de atencion.",
    });
  }

  if (form.treatments.length === 0) {
    issues.push({
      step: "treatments",
      message: "Falta seleccionar al menos un tratamiento.",
    });
  }

  const incompleteTreatment = form.treatments.find(
    (treatment) =>
      !getTreatmentRawPrice(treatment).trim() ||
      !getTreatmentRawDuration(treatment).trim() ||
      getTreatmentPriceOptions(treatment).some(
        (option: any) =>
          !String(option?.label || "").trim() ||
          !String(option?.price || "").trim()
      )
  );

  if (incompleteTreatment) {
    const incompleteOption = getTreatmentPriceOptions(incompleteTreatment).find(
      (option: any) =>
        !String(option?.label || "").trim() ||
        !String(option?.price || "").trim()
    );

    issues.push({
      step: "treatments",
      message: incompleteOption
        ? `Falta completar una opcion de precio en ${getTreatmentName(incompleteTreatment) || "un tratamiento"}.`
        : `Falta precio o duracion en ${getTreatmentName(incompleteTreatment) || "un tratamiento"}.`,
    });
  }

  return issues;
}

export default function EditSpecialistButton({
  specialist,
  clinics,
  treatments,
}: {
  specialist: any;
  clinics: any[];
  treatments: any[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeStep, setActiveStep] = useState("profile");
  const [form, setForm] = useState({
    name: specialist.name || "",
    specialty: specialist.specialty || "",
    clinic_name: specialist.clinic_name || "",
    consultation_address: specialist.consultation_address || "",
    image: specialist.image || "",
    slug: specialist.slug || "",
    bio: specialist.bio || "",
    rating: specialist.rating || "",
    reviews_count: specialist.reviews_count || "",
    treatments: specialist.treatments || [],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  function closeEditor() {
    setOpen(false);
    setActiveStep("profile");
    setActionError("");
  }

  function toggleTreatment(treatmentName: string) {
    const exists = form.treatments.some(
      (item: any) => normalize(getTreatmentName(item)) === normalize(treatmentName)
    );

    setForm({
      ...form,
      treatments: exists
        ? form.treatments.filter(
            (item: any) =>
              normalize(getTreatmentName(item)) !== normalize(treatmentName)
          )
        : [...form.treatments, { name: treatmentName, price: "", duration_minutes: "" }],
    });
  }

  function updateTreatmentPrice(treatmentName: string, price: string) {
    setForm({
      ...form,
      treatments: form.treatments.map((item: any) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              price,
            }
          : item
      ),
    });
  }

  function updateTreatmentDuration(treatmentName: string, duration: string) {
    setForm({
      ...form,
      treatments: form.treatments.map((item: any) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              duration_minutes: duration,
            }
          : item
      ),
    });
  }

  function addTreatmentPriceOption(treatmentName: string) {
    setForm({
      ...form,
      treatments: form.treatments.map((item: any) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              price_options: [
                ...getTreatmentPriceOptions(item),
                { label: "", price: "", duration_minutes: "" },
              ],
            }
          : item
      ),
    });
  }

  function updateTreatmentPriceOption(
    treatmentName: string,
    index: number,
    field: "label" | "price" | "duration_minutes",
    value: string
  ) {
    setForm({
      ...form,
      treatments: form.treatments.map((item: any) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              price_options: getTreatmentPriceOptions(item).map(
                (option: any, optionIndex: number) =>
                  optionIndex === index ? { ...option, [field]: value } : option
              ),
            }
          : item
      ),
    });
  }

  function removeTreatmentPriceOption(treatmentName: string, index: number) {
    setForm({
      ...form,
      treatments: form.treatments.map((item: any) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              price_options: getTreatmentPriceOptions(item).filter(
                (_option: any, optionIndex: number) => optionIndex !== index
              ),
            }
          : item
      ),
    });
  }

  async function saveSpecialist() {
    setActionError("");

    const issues = getValidationIssues(form);

    if (issues.length > 0) {
      const firstIssue = issues[0];
      const message =
        issues.length === 1
          ? firstIssue.message
          : `${firstIssue.message} Hay ${issues.length - 1} punto(s) mas por revisar.`;

      setActionError(message);
      setActiveStep(firstIssue.step);
      showAdminToast(
        message,
        "error"
      );
      return;
    }

    setLoading(true);

    let res: Response;

    try {
      res = await fetch("/api/update-specialist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: specialist.id,
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
          : "Error guardando especialista";

      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    showAdminToast("Especialista actualizado", "success");
    closeEditor();
    router.refresh();
  }

  const editor = (
    <>
      {open && (
        <AdminEntityEditorShell
          title="Editar especialista"
          steps={specialistEditorSteps}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onCancel={closeEditor}
          primaryAction={{
            label: "Guardar cambios",
            loadingLabel: "Guardando...",
            loading,
            onClick: saveSpecialist,
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
              {activeStep === "profile" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Perfil publico
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Datos del especialista
                  </h3>

                  <div className="mt-10 grid gap-5">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nombre"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <input
                      value={form.specialty}
                      onChange={(e) =>
                        setForm({ ...form, specialty: e.target.value })
                      }
                      placeholder="Especialidad"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="Slug"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <ImageUpload
                      value={form.image}
                      onChange={(url) => setForm({ ...form, image: url })}
                    />
                    <textarea
                      rows={8}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Biografia"
                      className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                    />
                  </div>
                </>
              )}

              {activeStep === "clinic" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Lugar de atencion
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Donde atiende
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-neutral-600">
                    Elige una clinica vinculada o dejalo como consulta independiente con direccion propia.
                  </p>
                  <select
                    value={form.clinic_name}
                    onChange={(e) =>
                      setForm({ ...form, clinic_name: e.target.value })
                    }
                    className="mt-10 h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                  >
                    <option value="">Consulta independiente</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.name}>
                        Clinica: {clinic.name}
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={form.consultation_address}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        consultation_address: e.target.value,
                      })
                    }
                    placeholder={"Direcciones de atencion si es consulta independiente, una por linea\nEj: Calle Serrano 45, Madrid\nEj: Avenida Diagonal 210, Barcelona"}
                    rows={5}
                    className="mt-4 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                  />
                  <div className="mt-4 rounded-[24px] bg-[#F8F5F1] p-5 text-sm leading-6 text-neutral-600">
                    Si hay clinica asociada, esta direccion queda como apoyo interno. Si no hay clinica, sera el lugar visible de atencion.
                  </div>
                </>
              )}

              {activeStep === "treatments" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Marketplace
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Tratamientos asignados
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-neutral-600">
                    Estos tratamientos determinan en que fichas publicas aparece
                    el especialista y que puede reservar el paciente.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {treatments.map((treatment) => {
                      const active = form.treatments.some(
                        (item: any) =>
                          normalize(getTreatmentName(item)) ===
                          normalize(treatment.name)
                      );

                      return (
                        <button
                          key={treatment.id}
                          type="button"
                          onClick={() => toggleTreatment(treatment.name)}
                          className={`rounded-full px-5 py-3 text-sm transition-all duration-300 ${
                            active ? "bg-black text-white" : "bg-[#F3EFE9]"
                          }`}
                        >
                          {treatment.name}
                        </button>
                      );
                    })}
                  </div>

                  {form.treatments.length > 0 && (
                    <div className="mt-8 grid gap-4">
                      {form.treatments.map((treatment: any) => {
                        const treatmentName = getTreatmentName(treatment);
                        const priceOptions = getTreatmentPriceOptions(treatment);

                        return (
                          <div
                            key={treatmentName}
                            className="rounded-[24px] bg-[#F8F5F1] p-4"
                          >
                            <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
                              <div>
                                <div className="font-medium">{treatmentName}</div>
                                <div className="mt-1 text-xs text-neutral-500">
                                  Precio desde, duracion y opciones por vial.
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                                  Precio desde
                                </label>
                                <input
                                  value={getTreatmentPriceValue(treatment)}
                                  onChange={(e) =>
                                    updateTreatmentPrice(
                                      treatmentName,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ej: 500 EUR"
                                  className="h-12 w-full rounded-2xl border border-black/5 bg-white px-4 outline-none"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                                  Duracion
                                </label>
                                <input
                                  value={getTreatmentDurationValue(treatment)}
                                  onChange={(e) =>
                                    updateTreatmentDuration(
                                      treatmentName,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ej: 45"
                                  inputMode="numeric"
                                  className="h-12 w-full rounded-2xl border border-black/5 bg-white px-4 outline-none"
                                />
                              </div>
                            </div>

                            <div className="mt-4 rounded-[20px] border border-black/5 bg-white p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">
                                    Opciones de precio
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-500">
                                    Ej: 1 vial - 500 EUR, 2 viales - 899 EUR.
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addTreatmentPriceOption(treatmentName)}
                                  className="rounded-full border border-black/10 px-4 py-2 text-xs font-medium transition hover:border-black"
                                >
                                  Anadir opcion
                                </button>
                              </div>

                              {priceOptions.length > 0 && (
                                <div className="mt-4 grid gap-3">
                                  {priceOptions.map((option: any, index: number) => (
                                    <div
                                      key={`${treatmentName}-${index}`}
                                      className="grid gap-3 md:grid-cols-[1fr_140px_140px_auto]"
                                    >
                                      <input
                                        value={option.label || ""}
                                        onChange={(e) =>
                                          updateTreatmentPriceOption(
                                            treatmentName,
                                            index,
                                            "label",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Ej: 1 vial"
                                        className="h-11 rounded-2xl border border-black/5 bg-[#F8F5F1] px-4 text-sm outline-none"
                                      />
                                      <input
                                        value={option.price || ""}
                                        onChange={(e) =>
                                          updateTreatmentPriceOption(
                                            treatmentName,
                                            index,
                                            "price",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Ej: 500 EUR"
                                        className="h-11 rounded-2xl border border-black/5 bg-[#F8F5F1] px-4 text-sm outline-none"
                                      />
                                      <input
                                        value={option.duration_minutes || ""}
                                        onChange={(e) =>
                                          updateTreatmentPriceOption(
                                            treatmentName,
                                            index,
                                            "duration_minutes",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Min opcional"
                                        inputMode="numeric"
                                        className="h-11 rounded-2xl border border-black/5 bg-[#F8F5F1] px-4 text-sm outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeTreatmentPriceOption(
                                            treatmentName,
                                            index
                                          )
                                        }
                                        className="h-11 rounded-2xl bg-black px-4 text-xs font-medium text-white"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeStep === "metrics" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Metricas
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Rating y reviews
                  </h3>
                  <div className="mt-10 grid gap-5">
                    <input
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: e.target.value })}
                      placeholder="Rating"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                    <input
                      value={form.reviews_count}
                      onChange={(e) =>
                        setForm({ ...form, reviews_count: e.target.value })
                      }
                      placeholder="Reviews"
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-8">
              <div className="overflow-hidden rounded-[40px] border border-black/5 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <div className="relative h-[360px] overflow-hidden">
                  <img
                    src={form.image || "https://placehold.co/1200x900?text=EncuentraTuClinica"}
                    alt={form.name}
                    className="h-full w-full object-contain bg-[#F8F5F1]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/70">
                      {form.specialty}
                    </div>
                    <div className="mt-3 text-4xl font-semibold">
                      {form.name}
                    </div>
                    <div className="mt-3 text-white/80">
                      {form.clinic_name || "Consulta independiente"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Tratamientos
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {form.treatments.map((treatment: any) => (
                    <span
                      key={getTreatmentName(treatment)}
                      className="rounded-full bg-[#F3EFE9] px-3 py-2 text-xs"
                    >
                      {getTreatmentName(treatment)}
                      {getTreatmentPriceValue(treatment)
                        ? ` - desde ${getTreatmentPriceValue(treatment)} EUR`
                        : ""}
                    </span>
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
