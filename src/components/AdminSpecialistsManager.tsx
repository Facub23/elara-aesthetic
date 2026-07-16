"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AdminEntityEditorShell from "@/components/AdminEntityEditorShell";
import AdminPublicationChecklist from "@/components/AdminPublicationChecklist";
import ConfirmDialog from "@/components/ConfirmDialog";
import EditSpecialistButton from "@/components/EditSpecialistButton";
import ImageUpload from "@/components/ImageUpload";
import { showAdminToast } from "@/components/AdminToast";
import {
  getTreatmentName,
  getTreatmentRawDuration,
  getTreatmentRawPrice,
} from "@/lib/treatment-utils";

const INDEPENDENT_SPECIALIST_LABEL = "Consulta independiente";

const specialistEditorSteps = [
  { id: "profile", label: "Perfil" },
  { id: "clinic", label: "Clinica" },
  { id: "treatments", label: "Tratamientos" },
  { id: "review", label: "Revision" },
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

function getSpecialistTreatmentNames(specialist: any): string[] {
  return Array.isArray(specialist.treatments)
    ? specialist.treatments.map(getTreatmentName).filter(Boolean)
    : [];
}

function hasCompleteTreatmentConfig(specialist: any) {
  return Array.isArray(specialist.treatments) && specialist.treatments.length > 0
    ? specialist.treatments.every(
        (treatment: any) =>
          getTreatmentRawPrice(treatment).trim().length > 0 &&
          getTreatmentRawDuration(treatment).trim().length > 0
      )
    : false;
}

function getSpecialistIssues(specialist: any, clinics: any[], treatments: any[]) {
  const clinicNames = new Set(clinics.map((clinic) => normalize(clinic.name)));
  const treatmentNames = new Set(
    treatments.map((treatment) => normalize(treatment.name))
  );
  const specialistTreatmentNames = getSpecialistTreatmentNames(specialist);
  const issues = [];

  if (!hasText(specialist.name) || !hasText(specialist.specialty)) {
    issues.push("Falta nombre o especialidad.");
  }

  if (hasText(specialist.clinic_name) && !clinicNames.has(normalize(specialist.clinic_name))) {
    issues.push("La clinica asignada no existe.");
  }

  if (!hasText(specialist.clinic_name) && !hasText(specialist.consultation_address)) {
    issues.push("Falta direccion de atencion para consulta independiente.");
  }

  if (!hasText(specialist.image)) {
    issues.push("Falta foto profesional.");
  }

  if (!hasText(specialist.bio) || specialist.bio.length < 80) {
    issues.push("La bio necesita mas detalle.");
  }

  if (specialistTreatmentNames.length === 0) {
    issues.push("No tiene tratamientos asignados.");
  }

  if (specialistTreatmentNames.length > 0 && !hasCompleteTreatmentConfig(specialist)) {
    issues.push("Cada tratamiento necesita precio y duracion propios del especialista.");
  }

  if (
    specialistTreatmentNames.some(
      (treatmentName) => !treatmentNames.has(normalize(treatmentName))
    )
  ) {
    issues.push("Tiene tratamientos fuera del catalogo.");
  }

  return issues;
}

function getSpecialistStatus(specialist: any, clinics: any[], treatments: any[]) {
  const issues = getSpecialistIssues(specialist, clinics, treatments);

  if (issues.length === 0) {
    return {
      key: "ready",
      label: "Listo",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (
    issues.some(
      (issue) =>
        issue.includes("clinica") ||
        issue.includes("direccion") ||
        issue.includes("tratamientos fuera")
    )
  ) {
    return {
      key: "connection",
      label: "Conexion pendiente",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    key: "incomplete",
    label: "Incompleto",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function isAvailabilityActive(item: any) {
  return item.active ?? item.is_active ?? true;
}

function getSpecialistScheduleStats(
  specialistName: string,
  availability: any[],
  vacations: any[],
  blockedDates: any[],
  blockedTimeSlots: any[]
) {
  const specialistKey = normalize(specialistName);
  const rows = availability.filter(
    (item) => normalize(item.specialist_name) === specialistKey
  );
  const activeRows = rows.filter(isAvailabilityActive);
  const vacationRows = vacations.filter(
    (item) => normalize(item.specialist_name) === specialistKey
  );
  const blockedDateRows = blockedDates.filter(
    (item) => normalize(item.specialist_name) === specialistKey
  );
  const blockedTimeRows = blockedTimeSlots.filter(
    (item) => normalize(item.specialist_name) === specialistKey
  );

  return {
    totalDays: rows.length,
    activeDays: activeRows.length,
    hasAvailability: activeRows.length > 0,
    hasVacations: vacationRows.length > 0,
    hasBlockedDates: blockedDateRows.length > 0,
    hasBlockedTimeSlots: blockedTimeRows.length > 0,
    vacationCount: vacationRows.length,
    blockedCount: blockedDateRows.length + blockedTimeRows.length,
  };
}

function getScheduleStatus(stats: ReturnType<typeof getSpecialistScheduleStats>) {
  if (!stats.hasAvailability) {
    return {
      key: "no-availability",
      label: "Sin disponibilidad",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stats.hasVacations) {
    return {
      key: "vacation",
      label: "Con vacaciones",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (stats.hasBlockedDates || stats.hasBlockedTimeSlots) {
    return {
      key: "blocked",
      label: "Con bloqueos",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    key: "active",
    label: "Horario activo",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function getSpecialistChecklist(specialist: any, clinics: any[] = [], treatments: any[] = []) {
  const clinicNames = new Set(clinics.map((clinic) => normalize(clinic.name)));
  const treatmentNames = new Set(
    treatments.map((treatment) => normalize(treatment.name))
  );
  const specialistTreatmentNames = getSpecialistTreatmentNames(specialist);

  return [
    {
      label: "Nombre y especialidad",
      done: hasText(specialist.name) && hasText(specialist.specialty),
      hint: "Completa nombre y especialidad visible.",
    },
    {
      label: "Lugar de atencion",
      done: hasText(specialist.clinic_name)
        ? clinics.length === 0 || clinicNames.has(normalize(specialist.clinic_name))
        : hasText(specialist.consultation_address),
      hint: "Asocia una clinica o indica una direccion de consulta independiente.",
    },
    {
      label: "Foto profesional",
      done: hasText(specialist.image),
      hint: "Sube una imagen de perfil.",
    },
    {
      label: "Bio suficiente",
      done: hasText(specialist.bio) && specialist.bio.length >= 80,
      hint: "Escribe una bio de al menos 80 caracteres.",
    },
    {
      label: "Tratamientos asignados",
      done: specialistTreatmentNames.length > 0,
      hint: "Selecciona al menos un tratamiento.",
    },
    {
      label: "Tratamientos del catalogo",
      done:
        specialistTreatmentNames.length > 0 &&
        specialistTreatmentNames.every((treatmentName) =>
          treatmentNames.has(normalize(treatmentName))
        ),
      hint: "Usa solo tratamientos existentes en el catalogo.",
    },
    {
      label: "Precio y duracion por tratamiento",
      done: specialistTreatmentNames.length > 0 && hasCompleteTreatmentConfig(specialist),
      hint: "Anade precio y duracion propios por tratamiento para reservas reales.",
    },
  ];
}

function emptyForm() {
  return {
    name: "",
    specialty: "",
    clinic_name: "",
    consultation_address: "",
    image: "",
    bio: "",
    rating: "5",
    reviews_count: "0",
    treatments: [] as Array<
      string | { name: string; price?: string; duration_minutes?: string }
    >,
  };
}

function isSpecialistReady(form: ReturnType<typeof emptyForm>) {
  return (
    hasText(form.name) &&
    hasText(form.specialty) &&
    (hasText(form.clinic_name) || hasText(form.consultation_address)) &&
    hasText(form.image) &&
    hasText(form.bio) &&
    form.treatments.length > 0 &&
    hasCompleteTreatmentConfig(form)
  );
}

function getFirstIssueStep(issue: string) {
  if (
    issue.includes("nombre") ||
    issue.includes("especialidad") ||
    issue.includes("foto") ||
    issue.includes("bio")
  ) {
    return "profile";
  }

  if (issue.includes("clinica") || issue.includes("direccion")) {
    return "clinic";
  }

  if (issue.includes("tratamiento") || issue.includes("precio") || issue.includes("duracion")) {
    return "treatments";
  }

  return "review";
}

export default function AdminSpecialistsManager({
  initialSpecialists,
  clinics,
  treatments,
  availability = [],
  vacations = [],
  blockedDates = [],
  blockedTimeSlots = [],
  initialClinicName = "",
  openCreateOnLoad = false,
  canCreate = true,
  canDelete = true,
}: {
  initialSpecialists: any[];
  clinics: any[];
  treatments: any[];
  availability?: any[];
  vacations?: any[];
  blockedDates?: any[];
  blockedTimeSlots?: any[];
  initialClinicName?: string;
  openCreateOnLoad?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [specialists, setSpecialists] = useState(initialSpecialists);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createAndConfigure, setCreateAndConfigure] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeStep, setActiveStep] = useState("profile");
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [treatmentFilter, setTreatmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!initialClinicName) {
      return;
    }

    setClinicFilter(initialClinicName);
    setForm((prev) => ({
      ...prev,
      clinic_name: initialClinicName,
    }));

    if (openCreateOnLoad && canCreate) {
      setOpen(true);
      setActiveStep("profile");
    }
  }, [canCreate, initialClinicName, openCreateOnLoad]);

  const filteredSpecialists = specialists.filter((specialist) => {
    const searchValue = search.toLowerCase();
    const treatmentNames = getSpecialistTreatmentNames(specialist);
    const status = getSpecialistStatus(specialist, clinics, treatments).key;
    const scheduleStatus = getScheduleStatus(
      getSpecialistScheduleStats(
        specialist.name,
        availability,
        vacations,
        blockedDates,
        blockedTimeSlots
      )
    ).key;
    const matchesSearch =
      specialist.name?.toLowerCase().includes(searchValue) ||
      specialist.specialty?.toLowerCase().includes(searchValue) ||
      specialist.clinic_name?.toLowerCase().includes(searchValue) ||
      specialist.consultation_address?.toLowerCase().includes(searchValue);
    const matchesClinic =
      !clinicFilter ||
      (clinicFilter === "__independent__"
        ? !specialist.clinic_name
        : specialist.clinic_name === clinicFilter);
    const matchesTreatment =
      !treatmentFilter || treatmentNames.includes(treatmentFilter);
    const matchesStatus = !statusFilter || status === statusFilter;
    const matchesSchedule =
      !scheduleFilter || scheduleStatus === scheduleFilter;

    return (
      matchesSearch &&
      matchesClinic &&
      matchesTreatment &&
      matchesStatus &&
      matchesSchedule
    );
  });

  const readyCount = specialists.filter(
    (specialist) =>
      getSpecialistStatus(specialist, clinics, treatments).key === "ready"
  ).length;
  const connectionIssueCount = specialists.filter(
    (specialist) =>
      getSpecialistStatus(specialist, clinics, treatments).key === "connection"
  ).length;
  const incompleteCount = specialists.filter(
    (specialist) =>
      getSpecialistStatus(specialist, clinics, treatments).key === "incomplete"
  ).length;
  const activeScheduleCount = specialists.filter(
    (specialist) =>
      getScheduleStatus(
        getSpecialistScheduleStats(
          specialist.name,
          availability,
          vacations,
          blockedDates,
          blockedTimeSlots
        )
      ).key !== "no-availability"
  ).length;
  const noScheduleCount = specialists.length - activeScheduleCount;

  function resetEditor() {
    setOpen(false);
    setActiveStep("profile");
    setActionError("");
    setForm(emptyForm());
  }

  function toggleTreatment(treatmentName: string) {
    setForm((prev) => ({
      ...prev,
      treatments: prev.treatments.some(
        (item) => normalize(getTreatmentName(item)) === normalize(treatmentName)
      )
        ? prev.treatments.filter(
            (item) =>
              normalize(getTreatmentName(item)) !== normalize(treatmentName)
          )
        : [...prev.treatments, { name: treatmentName, price: "", duration_minutes: "" }],
    }));
  }

  function updateTreatmentPrice(treatmentName: string, price: string) {
    setForm((prev) => ({
      ...prev,
      treatments: prev.treatments.map((item) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              price,
            }
          : item
      ),
    }));
  }

  function updateTreatmentDuration(treatmentName: string, duration: string) {
    setForm((prev) => ({
      ...prev,
      treatments: prev.treatments.map((item) =>
        normalize(getTreatmentName(item)) === normalize(treatmentName)
          ? {
              ...(typeof item === "object" ? item : { name: treatmentName }),
              name: treatmentName,
              duration_minutes: duration,
            }
          : item
      ),
    }));
  }

  async function createSpecialist(options?: { configureAvailability?: boolean }) {
    setActionError("");

    const issues = getSpecialistIssues(form, clinics, treatments);

    if (!isSpecialistReady(form) || issues.length > 0) {
      const message =
        issues.length > 0
          ? `${issues[0]}${
              issues.length > 1 ? ` Hay ${issues.length - 1} punto(s) mas por revisar.` : ""
            }`
          : "Completa perfil, lugar de atencion, imagen, bio, precio y duracion por tratamiento";

      setActionError(message);
      setActiveStep(issues[0] ? getFirstIssueStep(issues[0]) : "profile");
      showAdminToast(
        message,
        "error"
      );
      return;
    }

    if (options?.configureAvailability) {
      setCreateAndConfigure(true);
    }

    setLoading(true);

    let res: Response;

    try {
      res = await fetch("/api/create-specialist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
    } catch {
      const message = "No se pudo conectar con el servidor para crear.";

      setLoading(false);
      setCreateAndConfigure(false);
      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    const data = await res.json();

    setLoading(false);
    setCreateAndConfigure(false);

    if (!res.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : "Error creando especialista";

      setActionError(message);
      showAdminToast(message, "error");
      return;
    }

    showAdminToast("Especialista creado correctamente", "success");
    setSpecialists((prev) => [
      {
        ...form,
        id: data.specialist?.id,
        slug: data.specialist?.slug,
      },
      ...prev,
    ]);

    if (options?.configureAvailability) {
      const specialistName = data.specialist?.name || form.name;
      window.location.href = `/admin/calendar?specialist=${encodeURIComponent(
        specialistName
      )}`;
      return;
    }

    resetEditor();
    router.refresh();
  }

  async function deleteSpecialist() {
    if (!deleteId) return;

    const idToDelete = deleteId;

    const res = await fetch("/api/delete-specialist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: idToDelete,
      }),
    });

    if (!res.ok) {
      showAdminToast("Error eliminando especialista", "error");
      return;
    }

    showAdminToast("Especialista eliminado", "success");
    setSpecialists((prev) => prev.filter((item) => item.id !== idToDelete));
    setDeleteId(null);
  }

  return (
    <div className="mt-10">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-black px-6 py-3 text-white transition-all duration-300 hover:scale-[1.03]"
          >
            Nuevo especialista
          </button>
        </div>
      )}

      {open && canCreate && (
        <AdminEntityEditorShell
          title="Nuevo especialista"
          steps={specialistEditorSteps}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onCancel={resetEditor}
          primaryAction={{
            label: "Crear especialista",
            loadingLabel: "Creando...",
            loading: loading && !createAndConfigure,
            onClick: () => createSpecialist(),
          }}
          secondaryAction={{
            label: "Crear y configurar disponibilidad",
            loadingLabel: "Creando...",
            loading: loading && createAndConfigure,
            onClick: () => createSpecialist({ configureAvailability: true }),
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
                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Nombre
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Especialidad
                      </label>
                      <input
                        value={form.specialty}
                        onChange={(e) =>
                          setForm({ ...form, specialty: e.target.value })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Imagen
                      </label>
                      <ImageUpload
                        value={form.image}
                        onChange={(url) => setForm({ ...form, image: url })}
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Biografia
                      </label>
                      <textarea
                        rows={8}
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                      />
                    </div>
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

                  <div className="mt-10 grid gap-5">
                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Tipo de lugar
                      </label>
                      <select
                        value={form.clinic_name}
                        onChange={(e) =>
                          setForm({ ...form, clinic_name: e.target.value })
                        }
                        className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                      >
                        <option value="">Consulta independiente</option>
                        {clinics.map((clinic) => (
                          <option key={clinic.id} value={clinic.name}>
                            Clinica: {clinic.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs leading-5 text-neutral-500">
                        Si eliges una clinica, hereda su ubicacion publica. Si lo dejas como consulta independiente, la direccion de abajo sera obligatoria.
                      </p>
                    </div>

                    <div>
                      <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Direccion de atencion
                      </label>
                      <textarea
                        value={form.consultation_address}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            consultation_address: e.target.value,
                          })
                        }
                        placeholder={"Una direccion por linea\nEj: Calle Serrano 45, 1B, Madrid\nEj: Avenida Diagonal 210, Barcelona"}
                        rows={5}
                        className="w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] p-6 outline-none"
                      />
                    </div>

                    <div className="rounded-[28px] bg-[#F8F5F1] p-6 text-sm leading-6 text-neutral-600">
                      Las consultas independientes aparecen en el marketplace junto a las clinicas, pero con su propia direccion de atencion y sin ficha de clinica vinculada.
                    </div>
                  </div>
                </>
              )}

              {activeStep === "treatments" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Marketplace
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Tratamientos que realiza
                  </h3>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {treatments.map((treatment) => (
                      <button
                        type="button"
                        key={treatment.id}
                        onClick={() => toggleTreatment(treatment.name)}
                        className={`rounded-full px-5 py-3 text-sm transition-all ${
                          form.treatments.some(
                            (item) =>
                              normalize(getTreatmentName(item)) ===
                              normalize(treatment.name)
                          )
                            ? "bg-black text-white"
                            : "bg-[#F3EFE9]"
                        }`}
                      >
                        {treatment.name}
                      </button>
                    ))}
                  </div>

                  {form.treatments.length > 0 && (
                    <div className="mt-8 grid gap-4">
                      {form.treatments.map((treatment) => {
                        const treatmentName = getTreatmentName(treatment);

                        return (
                          <div
                            key={treatmentName}
                            className="grid gap-3 rounded-[24px] bg-[#F8F5F1] p-4 md:grid-cols-[1fr_160px_160px]"
                          >
                            <div>
                              <div className="font-medium">{treatmentName}</div>
                              <div className="mt-1 text-xs text-neutral-500">
                                Precio y duracion propios de este especialista.
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                                Precio
                              </label>
                              <input
                                value={getTreatmentPriceValue(treatment)}
                                onChange={(e) =>
                                  updateTreatmentPrice(
                                    treatmentName,
                                    e.target.value
                                  )
                                }
                                placeholder="Ej: 290 EUR"
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
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeStep === "review" && (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Revision
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold">
                    Publicacion y disponibilidad
                  </h3>
                  <p className="mt-5 leading-7 text-neutral-600">
                    Puedes crear el especialista y seguir editando despues, o
                    usar la accion secundaria para ir directo al calendario y
                    configurar horarios reales.
                  </p>

                  {!isSpecialistReady(form) && (
                    <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                      Para publicarlo correctamente necesitas perfil completo,
                      lugar de atencion, precio y duracion por tratamiento.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-8">
              <div className="overflow-hidden rounded-[40px] border border-black/5 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <div className="relative h-[360px] overflow-hidden">
                  <img
                    src={form.image || "https://placehold.co/1200x900?text=EncuentraTuClinica"}
                    alt={form.name || "Nuevo especialista"}
                    className="h-full w-full object-contain bg-[#F8F5F1]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/70">
                      {form.specialty || "Especialidad"}
                    </div>
                    <div className="mt-3 text-4xl font-semibold">
                      {form.name || "Nuevo especialista"}
                    </div>
                    <div className="mt-3 text-white/80">
                      {form.clinic_name || INDEPENDENT_SPECIALIST_LABEL}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] border border-black/5 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Datos extra
                </p>

                <div className="mt-8 grid gap-5">
                  <div>
                    <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                      Rating
                    </label>
                    <input
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: e.target.value })}
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm uppercase tracking-[0.2em] text-neutral-500">
                      Reviews
                    </label>
                    <input
                      value={form.reviews_count}
                      onChange={(e) =>
                        setForm({ ...form, reviews_count: e.target.value })
                      }
                      className="h-14 w-full rounded-[22px] border border-black/5 bg-[#F8F5F1] px-6 outline-none"
                    />
                  </div>
                </div>
              </div>

              <AdminPublicationChecklist
                items={getSpecialistChecklist(form, clinics, treatments)}
              />
            </div>
          </div>
        </AdminEntityEditorShell>
      )}

      <div className="mt-10 rounded-[32px] border border-black/10 bg-white/80 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.04)]">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-[#F8F5F1] p-5">
            <div className="text-3xl font-semibold">{readyCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
              Listos
            </div>
          </div>

          <div className="rounded-3xl bg-[#F8F5F1] p-5">
            <div className="text-3xl font-semibold">{connectionIssueCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
              Conexion pendiente
            </div>
          </div>

          <div className="rounded-3xl bg-[#F8F5F1] p-5">
            <div className="text-3xl font-semibold">{incompleteCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
              Incompletos
            </div>
          </div>

          <div className="rounded-3xl bg-[#F8F5F1] p-5">
            <div className="text-3xl font-semibold">{noScheduleCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
              Sin disponibilidad
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <input
            placeholder="Buscar especialista, especialidad o lugar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          />

          <select
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          >
            <option value="">Todos los lugares</option>
            <option value="__independent__">Consultas independientes</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.name}>
                {clinic.name}
              </option>
            ))}
          </select>

          <select
            value={treatmentFilter}
            onChange={(e) => setTreatmentFilter(e.target.value)}
            className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          >
            <option value="">Todos los tratamientos</option>
            {treatments.map((treatment) => (
              <option key={treatment.id} value={treatment.name}>
                {treatment.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="ready">Listos</option>
            <option value="connection">Conexion pendiente</option>
            <option value="incomplete">Incompletos</option>
          </select>

          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
          >
            <option value="">Toda la disponibilidad</option>
            <option value="active">Horario activo</option>
            <option value="no-availability">Sin disponibilidad</option>
            <option value="vacation">Con vacaciones</option>
            <option value="blocked">Con bloqueos</option>
          </select>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {filteredSpecialists.map((specialist) => {
          const status = getSpecialistStatus(specialist, clinics, treatments);
          const issues = getSpecialistIssues(specialist, clinics, treatments);
          const treatmentNames = getSpecialistTreatmentNames(specialist);
          const scheduleStats = getSpecialistScheduleStats(
            specialist.name,
            availability,
            vacations,
            blockedDates,
            blockedTimeSlots
          );
          const scheduleStatus = getScheduleStatus(scheduleStats);
          const clinic = clinics.find(
            (item) => item.name === specialist.clinic_name
          );

          return (
            <div
              key={specialist.id}
              className="overflow-hidden rounded-[36px] bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.04)]"
            >
              <div className="relative h-[280px] overflow-hidden">
                <img
                  src={
                    specialist.image ||
                    "https://placehold.co/1200x900?text=EncuentraTuClinica"
                  }
                  alt={specialist.name || "Especialista"}
                  className="h-full w-full object-contain bg-[#F8F5F1]"
                />

                <div
                  className={`absolute left-5 top-5 rounded-full border px-4 py-2 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </div>

                <div
                  className={`absolute right-5 top-5 rounded-full border px-4 py-2 text-xs font-medium ${scheduleStatus.className}`}
                >
                  {scheduleStatus.label}
                </div>
              </div>

              <div className="p-7">
                <h2 className="text-3xl font-semibold">
                  {specialist.name || "Sin nombre"}
                </h2>
                <p className="mt-2 text-neutral-500">
                  {specialist.specialty || "Sin especialidad"}
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  {specialist.clinic_name || INDEPENDENT_SPECIALIST_LABEL}
                </p>
                {!specialist.clinic_name && specialist.consultation_address && (
                  <p className="mt-2 rounded-2xl bg-[#F8F5F1] p-3 text-sm leading-6 text-neutral-600">
                    <span className="font-medium text-black">Direccion:</span>{" "}
                    {specialist.consultation_address}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#F8F5F1] p-4">
                    <div className="text-2xl font-semibold">
                      {treatmentNames.length}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                      Tratamientos
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F8F5F1] p-4">
                    <div className="text-2xl font-semibold">
                      {scheduleStats.activeDays}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                      Dias activos
                    </div>
                  </div>

                  <a
                    href={`/admin/calendar?specialist=${encodeURIComponent(
                      specialist.name || ""
                    )}`}
                    className="rounded-2xl bg-black p-4 text-white transition hover:opacity-90"
                  >
                    <div className="text-sm font-semibold">Disponibilidad</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/50">
                      Configurar
                    </div>
                  </a>
                </div>

                {issues.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    <div className="font-medium">Pendiente para marketplace</div>
                    <div className="mt-1">{issues[0]}</div>
                  </div>
                )}

                {!scheduleStats.hasAvailability && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                    <div className="font-medium">Agenda pendiente</div>
                    <div className="mt-1">
                      Configura al menos un dia activo para que pueda recibir
                      reservas.
                    </div>
                  </div>
                )}

                {scheduleStats.hasAvailability &&
                  (scheduleStats.hasVacations || scheduleStats.blockedCount > 0) && (
                    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                      <div className="font-medium">Agenda con excepciones</div>
                      <div className="mt-1">
                        {scheduleStats.vacationCount} vacaciones y{" "}
                        {scheduleStats.blockedCount} bloqueos configurados.
                      </div>
                    </div>
                  )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {treatmentNames.map((treatment) => (
                    <div
                      key={treatment}
                      className="rounded-full bg-[#F3EFE9] px-3 py-2 text-xs"
                    >
                      {treatment}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <AdminPublicationChecklist
                    items={getSpecialistChecklist(
                      specialist,
                      clinics,
                      treatments
                    )}
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {specialist.slug && (
                    <a
                      href={`/especialistas/${specialist.slug}`}
                      target="_blank"
                      className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
                    >
                      Ver perfil
                    </a>
                  )}

                  {clinic?.slug && (
                    <a
                      href={`/clinics/${clinic.slug}`}
                      target="_blank"
                      className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm transition-all duration-300 hover:bg-black hover:text-white"
                    >
                      Ver clinica
                    </a>
                  )}

                  <EditSpecialistButton
                    specialist={specialist}
                    clinics={clinics}
                    treatments={treatments}
                  />

                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(specialist.id)}
                      className="rounded-full bg-red-500 px-5 py-3 text-sm text-white"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar especialista"
        description="Esta accion eliminara el especialista permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={deleteSpecialist}
      />
    </div>
  );
}
