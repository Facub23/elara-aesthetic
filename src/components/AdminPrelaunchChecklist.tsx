import Link from "next/link";

import { isPublicPlaceholderRecord } from "@/lib/public-records";
import { getTreatmentName, getTreatmentRawPrice } from "@/lib/treatment-utils";

type AdminPrelaunchChecklistProps = {
  clinics: any[];
  specialists: any[];
  treatments: any[];
  availability: any[];
  notificationDeliveries: any[];
  pendingBookings: any[];
  activityLogs: any[];
};

type ChecklistPriority = "critical" | "recommended" | "manual";

type ChecklistItem = {
  label: string;
  done: boolean;
  hint: string;
  href: string;
  priority: ChecklistPriority;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function hasTreatmentPrice(treatment: any) {
  return hasText(getTreatmentRawPrice(treatment));
}

function getScore(items: Array<{ done: boolean }>) {
  if (items.length === 0) return 0;
  return Math.round(
    (items.filter((item) => item.done).length / items.length) * 100
  );
}

export default function AdminPrelaunchChecklist({
  clinics,
  specialists,
  treatments,
  availability,
  notificationDeliveries,
  pendingBookings,
  activityLogs,
}: AdminPrelaunchChecklistProps) {
  const clinicNames = new Set(clinics.map((clinic) => normalize(clinic.name)));
  const treatmentNames = new Set(
    treatments.map((treatment) => normalize(treatment.name))
  );
  const activeAvailabilityNames = new Set(
    availability
      .filter((item) => item.active ?? item.is_active ?? true)
      .map((item) => normalize(item.specialist_name))
      .filter(Boolean)
  );

  const connectedSpecialists = specialists.filter((specialist) =>
    clinicNames.has(normalize(specialist.clinic_name)) ||
    (!hasText(specialist.clinic_name) &&
      !hasText(String(specialist.clinic_id || "")) &&
      hasText(specialist.consultation_address))
  );
  const specialistsWithTreatments = specialists.filter(
    (specialist) =>
      Array.isArray(specialist.treatments) && specialist.treatments.length > 0
  );
  const specialistsWithPrices = specialists.filter(
    (specialist) =>
      Array.isArray(specialist.treatments) &&
      specialist.treatments.length > 0 &&
      specialist.treatments.some(hasTreatmentPrice)
  );
  const specialistsWithKnownTreatments = specialists.filter((specialist) =>
    Array.isArray(specialist.treatments)
      ? specialist.treatments.every((treatment: any) =>
          treatmentNames.has(normalize(getTreatmentName(treatment)))
        )
      : false
  );
  const specialistsWithAvailability = specialists.filter((specialist) =>
    activeAvailabilityNames.has(normalize(specialist.name))
  );
  const completeTreatments = treatments.filter(
    (treatment) =>
      hasText(treatment.name) &&
      hasText(treatment.slug) &&
      hasText(treatment.image) &&
      hasText(treatment.description) &&
      treatment.description.length >= 80
  );
  const completeClinics = clinics.filter(
    (clinic) =>
      hasText(clinic.name) &&
      hasText(clinic.slug) &&
      hasText(clinic.city) &&
      hasText(clinic.image) &&
      hasText(clinic.description) &&
      clinic.description.length >= 100
  );
  const failedDeliveries = notificationDeliveries.filter(
    (delivery) => delivery.status === "failed"
  );
  const demoRecordsCount = [
    ...clinics,
    ...specialists,
    ...treatments,
  ].filter((record) => isPublicPlaceholderRecord(record)).length;

  const items: ChecklistItem[] = [
    {
      label: "Clinicas listas",
      done: clinics.length > 0 && completeClinics.length === clinics.length,
      hint: `${completeClinics.length}/${clinics.length} con ficha completa`,
      href: "/admin/clinicas",
      priority: "critical",
    },
    {
      label: "Especialistas con lugar de atencion",
      done:
        specialists.length > 0 &&
        connectedSpecialists.length === specialists.length,
      hint: `${connectedSpecialists.length}/${specialists.length} con clinica o consulta independiente`,
      href: "/admin/especialistas",
      priority: "critical",
    },
    {
      label: "Tratamientos publicables",
      done:
        treatments.length > 0 && completeTreatments.length === treatments.length,
      hint: `${completeTreatments.length}/${treatments.length} con imagen y descripcion`,
      href: "/admin/tratamientos",
      priority: "critical",
    },
    {
      label: "Precios visibles",
      done:
        specialists.length > 0 &&
        specialistsWithPrices.length === specialists.length,
      hint: `${specialistsWithPrices.length}/${specialists.length} especialistas con precios`,
      href: "/admin/especialistas",
      priority: "recommended",
    },
    {
      label: "Catalogo alineado",
      done:
        specialists.length > 0 &&
        specialistsWithTreatments.length === specialists.length &&
        specialistsWithKnownTreatments.length === specialists.length,
      hint: "Cada especialista debe usar tratamientos existentes",
      href: "/admin/especialistas",
      priority: "critical",
    },
    {
      label: "Agenda disponible",
      done:
        specialists.length > 0 &&
        specialistsWithAvailability.length === specialists.length,
      hint: `${specialistsWithAvailability.length}/${specialists.length} con horario activo`,
      href: "/admin/calendar",
      priority: "critical",
    },
    {
      label: "Reservas pendientes controladas",
      done: pendingBookings.length === 0,
      hint: `${pendingBookings.length} solicitudes pendientes`,
      href: "/admin/reservas?status=Pendiente",
      priority: "recommended",
    },
    {
      label: "Envios sin fallos recientes",
      done: failedDeliveries.length === 0,
      hint: `${failedDeliveries.length} envios fallidos recientes`,
      href: "/admin/notificaciones?status=failed",
      priority: "recommended",
    },
    {
      label: "Auditoria activa",
      done: activityLogs.length > 0,
      hint: "El panel debe registrar cambios internos",
      href: "/admin",
      priority: "recommended",
    },
    {
      label: "Datos demo controlados",
      done: demoRecordsCount === 0,
      hint:
        demoRecordsCount === 0
          ? "No hay registros marcados como demo, prueba, test o QA"
          : `${demoRecordsCount} registros demo/prueba detectados para limpiar antes del lanzamiento`,
      href: "/admin/clinicas",
      priority: "manual",
    },
  ];

  const score = getScore(items);
  const criticalItems = items.filter((item) => item.priority === "critical");
  const criticalMissing = criticalItems.filter((item) => !item.done);
  const manualItems = items.filter((item) => item.priority === "manual");
  const completedItems = items.filter((item) => item.done).length;

  const summaryCards = [
    {
      label: "Bloqueos",
      value: criticalMissing.length,
      detail:
        criticalMissing.length === 0
          ? "Sin bloqueos tecnicos de contenido"
          : "Criticos antes de publicar",
      tone: criticalMissing.length === 0 ? "good" : "bad",
    },
    {
      label: "Automatico",
      value: `${completedItems}/${items.length}`,
      detail: "checks completos",
      tone: "neutral",
    },
    {
      label: "Datos demo",
      value: demoRecordsCount,
      detail: "limpiar al final, antes de publicar",
      tone: demoRecordsCount === 0 ? "good" : "warn",
    },
  ];

  return (
    <section className="mt-10 rounded-[32px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.04)] lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Pre-lanzamiento
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Checklist de publicacion
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Controla lo imprescindible antes de cargar contenido definitivo y
            abrir el marketplace al publico.
          </p>
        </div>

        <div className="rounded-3xl bg-black px-6 py-5 text-white">
          <div className="text-sm uppercase tracking-[0.2em] text-white/60">
            Preparacion
          </div>
          <div className="mt-2 text-4xl font-semibold">{score}%</div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-3xl border p-5 ${
              card.tone === "good"
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : card.tone === "bad"
                  ? "border-red-100 bg-red-50 text-red-800"
                  : card.tone === "warn"
                    ? "border-amber-100 bg-amber-50 text-amber-900"
                    : "border-black/5 bg-[#F7F5F2] text-neutral-800"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {card.value}
            </p>
            <p className="mt-2 text-sm opacity-75">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-3xl border p-5 transition hover:bg-black hover:text-white ${
              item.done
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : item.priority === "critical"
                  ? "border-red-100 bg-red-50 text-red-800"
                  : item.priority === "manual"
                    ? "border-sky-100 bg-sky-50 text-sky-800"
                    : "border-amber-100 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-2 text-sm opacity-70">{item.hint}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-black">
                {item.done
                  ? "OK"
                  : item.priority === "critical"
                    ? "Bloquea"
                    : item.priority === "manual"
                      ? "Manual"
                      : "Revisar"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {manualItems.some((item) => !item.done) && (
        <p className="mt-5 text-sm text-neutral-500">
          Los checks manuales no impiden seguir desarrollando; son recordatorios
          para el ultimo repaso antes de publicar con datos reales.
        </p>
      )}
    </section>
  );
}
