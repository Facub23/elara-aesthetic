import Link from "next/link";

import AdminPublicationChecklist, {
  getPublicationScore,
  getPublicationStatus,
} from "@/components/AdminPublicationChecklist";

type ClinicWorkspaceProps = {
  clinic: any;
  specialists: any[];
  treatments: string[];
  checklistItems: {
    label: string;
    done: boolean;
    hint?: string;
  }[];
};

export default function AdminClinicWorkspace({
  clinic,
  specialists,
  treatments,
  checklistItems,
}: ClinicWorkspaceProps) {
  const score = getPublicationScore(checklistItems);
  const status = getPublicationStatus(score);

  return (
    <section className="rounded-[40px] border border-white/40 bg-white/75 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl sm:p-8">
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="overflow-hidden rounded-[32px] bg-[#F7F5F2]">
            <img
              src={
                clinic.image ||
                "https://placehold.co/1200x800?text=EncuentraTuClinica"
              }
              alt={clinic.name}
              className="h-[320px] w-full object-contain bg-[#F8F5F1]"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/clinics/${clinic.slug}`}
              target="_blank"
              className="rounded-2xl bg-black px-5 py-4 text-center text-sm text-white"
            >
              Ver ficha publica
            </Link>
            <Link
              href="/admin/reservas"
              className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-center text-sm transition hover:border-black"
            >
              Reservas
            </Link>
            <Link
              href="/admin/calendar"
              className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-center text-sm transition hover:border-black"
            >
              Agenda
            </Link>
            <Link
              href="/admin/pacientes"
              className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-center text-sm transition hover:border-black"
            >
              Pacientes
            </Link>
            <Link
              href="/admin/analytics"
              className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-center text-sm transition hover:border-black"
            >
              Metricas
            </Link>
            <Link
              href="/admin/especialistas"
              className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-center text-sm transition hover:border-black"
            >
              Especialistas
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Mi clinica
          </p>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {clinic.name}
              </h1>
              <p className="mt-3 text-neutral-500">
                {clinic.city}, {clinic.country}
              </p>
            </div>

            <div className={`w-fit rounded-full border px-4 py-2 text-sm ${status.className}`}>
              {status.label}
            </div>
          </div>

          <p className="mt-6 max-w-2xl leading-7 text-neutral-600">
            {clinic.description || "Completa la descripcion para mejorar la ficha publica."}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-[#F7F5F2] p-5">
              <div className="text-3xl font-semibold">{specialists.length}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                Especialistas
              </div>
            </div>
            <div className="rounded-3xl bg-[#F7F5F2] p-5">
              <div className="text-3xl font-semibold">{treatments.length}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                Tratamientos
              </div>
            </div>
            <div className="rounded-3xl bg-black p-5 text-white">
              <div className="text-3xl font-semibold">{score}%</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/55">
                Publicacion
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] bg-white p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Especialistas
              </div>
              <div className="mt-4 grid gap-2">
                {specialists.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    Todavia no hay especialistas vinculados.
                  </p>
                ) : (
                  specialists.slice(0, 5).map((specialist) => (
                    <Link
                      key={specialist.id}
                      href={`/especialistas/${specialist.slug}`}
                      target="_blank"
                      className="rounded-2xl bg-[#F7F5F2] px-4 py-3 text-sm transition hover:bg-black hover:text-white"
                    >
                      {specialist.name}
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Tratamientos
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {treatments.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    Vincula tratamientos desde los especialistas.
                  </p>
                ) : (
                  treatments.slice(0, 8).map((treatment) => (
                    <span
                      key={treatment}
                      className="rounded-full bg-[#F3EFE9] px-3 py-2 text-xs"
                    >
                      {treatment}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <AdminPublicationChecklist items={checklistItems} />
          </div>
        </div>
      </div>
    </section>
  );
}
