import Link from "next/link";
import {
  getTreatmentName,
  getTreatmentRawPrice,
} from "@/lib/treatment-utils";

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function hasTreatmentPrice(treatment: any) {
  return hasText(getTreatmentRawPrice(treatment));
}

function getDuplicateValues(items: any[], field: string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const value = normalize(item?.[field]);

    if (!value) return;

    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

export default function AdminMarketplaceHealth({
  clinics,
  specialists,
  treatments,
  availability = [],
}: {
  clinics: any[];
  specialists: any[];
  treatments: any[];
  availability?: any[];
}) {
  const clinicNames = new Set(clinics.map((clinic) => normalize(clinic.name)));
  const clinicIds = new Set(clinics.map((clinic) => String(clinic.id)));
  const specialistNames = new Set(
    specialists.map((specialist) => normalize(specialist.name))
  );
  const treatmentNames = new Set(
    treatments.map((treatment) => normalize(treatment.name))
  );
  const clinicNameById = new Map(
    clinics.map((clinic) => [String(clinic.id), normalize(clinic.name)])
  );

  const specialistsByClinic = new Map<string, any[]>();
  const treatmentNamesByClinic = new Map<string, Set<string>>();
  const referencedTreatmentNames = new Set<string>();

  clinics.forEach((clinic) => {
    specialistsByClinic.set(normalize(clinic.name), []);
    treatmentNamesByClinic.set(normalize(clinic.name), new Set());
  });

  specialists.forEach((specialist) => {
    const clinicKey = normalize(specialist.clinic_name);

    if (clinicKey && specialistsByClinic.has(clinicKey)) {
      specialistsByClinic.get(clinicKey)?.push(specialist);
    }

    if (Array.isArray(specialist.treatments)) {
      specialist.treatments.forEach((treatment: any) => {
        const treatmentName = getTreatmentName(treatment);
        const treatmentKey = normalize(treatmentName);

        if (!treatmentKey) return;

        referencedTreatmentNames.add(treatmentKey);

        if (clinicKey && treatmentNamesByClinic.has(clinicKey)) {
          treatmentNamesByClinic.get(clinicKey)?.add(treatmentName);
        }
      });
    }
  });

  const clinicsWithoutSpecialists = clinics.filter(
    (clinic) => (specialistsByClinic.get(normalize(clinic.name)) || []).length === 0
  );
  const clinicsWithoutTreatments = clinics.filter(
    (clinic) => (treatmentNamesByClinic.get(normalize(clinic.name)) || new Set()).size === 0
  );
  const independentSpecialistsWithoutAddress = specialists.filter(
    (specialist) =>
      !hasText(specialist.clinic_name) &&
      !hasText(String(specialist.clinic_id || "")) &&
      !hasText(specialist.consultation_address)
  );
  const specialistsWithoutValidClinic = specialists.filter(
    (specialist) =>
      hasText(specialist.clinic_name) &&
      !clinicNames.has(normalize(specialist.clinic_name)) &&
      !clinicIds.has(String(specialist.clinic_id || ""))
  );
  const specialistsWithClinicMismatch = specialists.filter((specialist) => {
    if (!specialist.clinic_id || !specialist.clinic_name) return false;

    const clinicName = clinicNameById.get(String(specialist.clinic_id));

    return Boolean(
      clinicName && clinicName !== normalize(specialist.clinic_name)
    );
  });
  const duplicateClinicSlugs = getDuplicateValues(clinics, "slug");
  const duplicateSpecialistSlugs = getDuplicateValues(specialists, "slug");
  const duplicateTreatmentSlugs = getDuplicateValues(treatments, "slug");
  const duplicateClinicNames = getDuplicateValues(clinics, "name");
  const duplicateSpecialistNames = getDuplicateValues(specialists, "name");
  const duplicateTreatmentNames = getDuplicateValues(treatments, "name");
  const availabilityWithoutSpecialist = availability.filter(
    (item) => !specialistNames.has(normalize(item.specialist_name))
  );
  const specialistsWithoutTreatments = specialists.filter(
    (specialist) => !Array.isArray(specialist.treatments) || specialist.treatments.length === 0
  );
  const specialistsWithoutPrices = specialists.filter(
    (specialist) =>
      Array.isArray(specialist.treatments) &&
      specialist.treatments.length > 0 &&
      !specialist.treatments.some(hasTreatmentPrice)
  );
  const specialistsWithUnknownTreatments = specialists.filter((specialist) =>
    Array.isArray(specialist.treatments)
      ? specialist.treatments.some((treatment: any) => {
          const treatmentKey = normalize(getTreatmentName(treatment));

          return treatmentKey && !treatmentNames.has(treatmentKey);
        })
      : false
  );
  const treatmentsWithoutSpecialists = treatments.filter(
    (treatment) => !referencedTreatmentNames.has(normalize(treatment.name))
  );
  const treatmentsMissingContent = treatments.filter(
    (treatment) =>
      !hasText(treatment.image) ||
      !hasText(treatment.description) ||
      treatment.description.length < 80
  );
  const specialistsMissingProfile = specialists.filter(
    (specialist) => !hasText(specialist.image) || !hasText(specialist.bio)
  );
  const activeAvailabilityNames = new Set(
    availability
      .filter((item) => item.active ?? item.is_active ?? true)
      .map((item) => normalize(item.specialist_name))
      .filter(Boolean)
  );
  const specialistsWithoutAvailability = specialists.filter(
    (specialist) => !activeAvailabilityNames.has(normalize(specialist.name))
  );

  const checks = [
    {
      label: "Clinicas con especialistas",
      value: clinics.length - clinicsWithoutSpecialists.length,
      total: clinics.length,
      href: "/admin/clinicas",
    },
    {
      label: "Clinicas con tratamientos",
      value: clinics.length - clinicsWithoutTreatments.length,
      total: clinics.length,
      href: "/admin/clinicas",
    },
    {
      label: "Tratamientos activos",
      value: treatments.length - treatmentsWithoutSpecialists.length,
      total: treatments.length,
      href: "/admin/tratamientos",
    },
    {
      label: "Lugar de atencion",
      value:
        specialists.length -
        specialistsWithoutValidClinic.length -
        specialistsWithClinicMismatch.length -
        independentSpecialistsWithoutAddress.length,
      total: specialists.length,
      href: "/admin/especialistas",
    },
    {
      label: "Especialistas con horario",
      value: specialists.length - specialistsWithoutAvailability.length,
      total: specialists.length,
      href: "/admin/especialistas",
    },
    {
      label: "Precios visibles",
      value: specialists.length - specialistsWithoutPrices.length,
      total: specialists.length,
      href: "/admin/especialistas",
    },
  ];

  const issues = [
    ...duplicateClinicSlugs.map((slug) => ({
      label: `Hay mas de una clinica usando el slug "${slug}".`,
      href: "/admin/clinicas",
    })),
    ...duplicateSpecialistSlugs.map((slug) => ({
      label: `Hay mas de un especialista usando el slug "${slug}".`,
      href: "/admin/especialistas",
    })),
    ...duplicateTreatmentSlugs.map((slug) => ({
      label: `Hay mas de un tratamiento usando el slug "${slug}".`,
      href: "/admin/tratamientos",
    })),
    ...duplicateClinicNames.map((name) => ({
      label: `Hay mas de una clinica con el nombre "${name}".`,
      href: "/admin/clinicas",
    })),
    ...duplicateSpecialistNames.map((name) => ({
      label: `Hay mas de un especialista con el nombre "${name}".`,
      href: "/admin/especialistas",
    })),
    ...duplicateTreatmentNames.map((name) => ({
      label: `Hay mas de un tratamiento con el nombre "${name}".`,
      href: "/admin/tratamientos",
    })),
    ...clinicsWithoutSpecialists.map((clinic) => ({
      label: `${clinic.name} no tiene especialistas.`,
      href: `/admin/especialistas?clinic=${encodeURIComponent(clinic.name)}&new=1`,
    })),
    ...clinicsWithoutTreatments.map((clinic) => ({
      label: `${clinic.name} no tiene tratamientos visibles.`,
      href: `/admin/especialistas?clinic=${encodeURIComponent(clinic.name)}`,
    })),
    ...specialistsWithoutValidClinic.map((specialist) => ({
      label: `${specialist.name} no esta conectado a una clinica valida.`,
      href: "/admin/especialistas",
    })),
    ...independentSpecialistsWithoutAddress.map((specialist) => ({
      label: `${specialist.name} es independiente y necesita direccion de atencion.`,
      href: "/admin/especialistas",
    })),
    ...specialistsWithClinicMismatch.map((specialist) => ({
      label: `${specialist.name} tiene clinic_id y nombre de clinica desalineados.`,
      href: "/admin/especialistas",
    })),
    ...specialistsWithoutTreatments.map((specialist) => ({
      label: `${specialist.name} no tiene tratamientos asignados.`,
      href: "/admin/especialistas",
    })),
    ...specialistsWithoutPrices.map((specialist) => ({
      label: `${specialist.name} no tiene precios por tratamiento.`,
      href: "/admin/especialistas",
    })),
    ...specialistsWithUnknownTreatments.map((specialist) => ({
      label: `${specialist.name} tiene tratamientos que no existen en el catalogo.`,
      href: "/admin/especialistas",
    })),
    ...treatmentsWithoutSpecialists.map((treatment) => ({
      label: `${treatment.name} no aparece en ningun especialista.`,
      href: "/admin/tratamientos",
    })),
    ...treatmentsMissingContent.map((treatment) => ({
      label: `${treatment.name} necesita mejor imagen o descripcion.`,
      href: "/admin/tratamientos",
    })),
    ...specialistsMissingProfile.map((specialist) => ({
      label: `${specialist.name} necesita completar foto o bio.`,
      href: "/admin/especialistas",
    })),
    ...specialistsWithoutAvailability.map((specialist) => ({
      label: `${specialist.name} no tiene horario activo para reservas.`,
      href: `/admin/calendar?specialist=${encodeURIComponent(
        specialist.name || ""
      )}`,
    })),
    ...availabilityWithoutSpecialist.map((item) => ({
      label: `Hay horarios para "${item.specialist_name}" pero ese especialista no existe.`,
      href: "/admin/calendar",
    })),
  ];

  const totalChecks = checks.reduce((sum, check) => sum + check.total, 0);
  const completedChecks = checks.reduce((sum, check) => sum + check.value, 0);
  const score =
    totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

  return (
    <section className="mt-10 rounded-[32px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.04)] lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Salud del marketplace
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Conexiones clave
          </h2>

          <p className="mt-3 max-w-2xl text-neutral-500">
            Controla que cada clinica, consulta independiente, tratamiento y
            especialista este alineado antes de mostrarse en la web publica.
          </p>
        </div>

        <div className="rounded-3xl bg-black px-6 py-5 text-white">
          <div className="text-sm uppercase tracking-[0.2em] text-white/60">
            Cobertura
          </div>
          <div className="mt-2 text-4xl font-semibold">{score}%</div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {checks.map((check) => (
          <Link
            key={check.label}
            href={check.href}
            className="rounded-3xl border border-black/5 bg-[#F8F5F1] p-5 transition hover:bg-black hover:text-white"
          >
            <div className="text-3xl font-semibold">
              {check.value}/{check.total}
            </div>
            <div className="mt-2 text-sm uppercase tracking-[0.16em] opacity-70">
              {check.label}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-black/5 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Acciones pendientes</div>
            <div className="mt-1 text-sm text-neutral-500">
              {issues.length === 0
                ? "Todo esta conectado correctamente."
                : `${issues.length} mejoras detectadas.`}
            </div>
          </div>

          {issues.length > 0 && (
            <Link
              href={issues[0].href}
              className="shrink-0 rounded-full bg-black px-5 py-3 text-sm text-white"
            >
              Resolver primero
            </Link>
          )}
        </div>

        {issues.length > 0 && (
          <div className="mt-5 grid gap-3">
            {issues.slice(0, 6).map((issue) => (
              <Link
                key={issue.label}
                href={issue.href}
                className="flex items-center justify-between gap-4 rounded-2xl bg-[#F8F5F1] p-4 text-sm transition hover:bg-black hover:text-white"
              >
                <span>{issue.label}</span>
                <span aria-hidden="true">-&gt;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
