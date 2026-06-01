import Link from "next/link";

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
    clinicNames.has(normalize(specialist.clinic_name))
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

  const items = [
    {
      label: "Clínicas listas",
      done: clinics.length > 0 && completeClinics.length === clinics.length,
      hint: `${completeClinics.length}/${clinics.length} con ficha completa`,
      href: "/admin/clinicas",
    },
    {
      label: "Especialistas conectados",
      done:
        specialists.length > 0 &&
        connectedSpecialists.length === specialists.length,
      hint: `${connectedSpecialists.length}/${specialists.length} conectados a clínica`,
      href: "/admin/especialistas",
    },
    {
      label: "Tratamientos publicables",
      done:
        treatments.length > 0 && completeTreatments.length === treatments.length,
      hint: `${completeTreatments.length}/${treatments.length} con imagen y descripción`,
      href: "/admin/tratamientos",
    },
    {
      label: "Precios visibles",
      done:
        specialists.length > 0 &&
        specialistsWithPrices.length === specialists.length,
      hint: `${specialistsWithPrices.length}/${specialists.length} especialistas con precios`,
      href: "/admin/especialistas",
    },
    {
      label: "Catálogo alineado",
      done:
        specialists.length > 0 &&
        specialistsWithTreatments.length === specialists.length &&
        specialistsWithKnownTreatments.length === specialists.length,
      hint: "Cada especialista debe usar tratamientos existentes",
      href: "/admin/especialistas",
    },
    {
      label: "Agenda disponible",
      done:
        specialists.length > 0 &&
        specialistsWithAvailability.length === specialists.length,
      hint: `${specialistsWithAvailability.length}/${specialists.length} con horario activo`,
      href: "/admin/calendar",
    },
    {
      label: "Reservas pendientes controladas",
      done: pendingBookings.length === 0,
      hint: `${pendingBookings.length} solicitudes pendientes`,
      href: "/admin/reservas?status=Pendiente",
    },
    {
      label: "Envíos sin fallos recientes",
      done: failedDeliveries.length === 0,
      hint: `${failedDeliveries.length} envíos fallidos recientes`,
      href: "/admin/notificaciones?status=failed",
    },
    {
      label: "Auditoría activa",
      done: activityLogs.length > 0,
      hint: "El panel debe registrar cambios internos",
      href: "/admin",
    },
  ];

  const score = getScore(items);

  return (
    <section className="mt-10 rounded-[32px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.04)] lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Pre-lanzamiento
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Checklist de publicación
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Controla lo imprescindible antes de cargar contenido definitivo y
            abrir el marketplace al público.
          </p>
        </div>

        <div className="rounded-3xl bg-black px-6 py-5 text-white">
          <div className="text-sm uppercase tracking-[0.2em] text-white/60">
            Preparación
          </div>
          <div className="mt-2 text-4xl font-semibold">{score}%</div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-3xl border p-5 transition hover:bg-black hover:text-white ${
              item.done
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-amber-100 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-2 text-sm opacity-70">{item.hint}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-black">
                {item.done ? "OK" : "Revisar"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
