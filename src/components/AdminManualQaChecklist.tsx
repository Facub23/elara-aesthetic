"use client";

import { useEffect, useMemo, useState } from "react";

type QaItem = {
  id: string;
  group: string;
  label: string;
  hint: string;
  href?: string;
};

const STORAGE_KEY = "encuentra-admin-prelaunch-qa-v1";

const qaItems: QaItem[] = [
  {
    id: "public-booking-flow",
    group: "Reserva publica",
    label: "Reserva completa",
    hint: "Elegir tratamiento, especialista, fecha, hora y confirmar reserva.",
    href: "/tratamientos",
  },
  {
    id: "booking-email",
    group: "Reserva publica",
    label: "Email de reserva",
    hint: "Confirmar que el paciente recibe el correo correcto.",
    href: "/admin/emails",
  },
  {
    id: "admin-reschedule-availability",
    group: "Reservas admin",
    label: "Reprogramacion con disponibilidad",
    hint: "Comprobar que solo permite dias y horas realmente disponibles.",
    href: "/admin/reservas",
  },
  {
    id: "admin-statuses",
    group: "Reservas admin",
    label: "Estados de cita",
    hint: "Probar pendiente, confirmada, cancelada, no asistio y asistio.",
    href: "/admin/reservas",
  },
  {
    id: "auto-complete",
    group: "Reservas admin",
    label: "Citas pasadas",
    hint: "Verificar que una cita pasada pueda quedar como asistio cuando corresponda.",
    href: "/admin/reservas",
  },
  {
    id: "clinic-role-scope",
    group: "Accesos",
    label: "Rol clinica",
    hint: "Entrar con admin de clinica y confirmar que solo ve su clinica.",
    href: "/admin/admins",
  },
  {
    id: "specialist-role-scope",
    group: "Accesos",
    label: "Rol especialista",
    hint: "Entrar con especialista y confirmar que solo ve su agenda.",
    href: "/admin/admins",
  },
  {
    id: "google-create",
    group: "Google Calendar",
    label: "Crear evento",
    hint: "Hacer una reserva confirmada y comprobar que aparece en Google Calendar.",
    href: "/admin/calendar",
  },
  {
    id: "google-update",
    group: "Google Calendar",
    label: "Actualizar evento",
    hint: "Reprogramar una reserva y comprobar que cambia el evento externo.",
    href: "/admin/reservas",
  },
  {
    id: "google-cancel",
    group: "Google Calendar",
    label: "Cancelar evento",
    hint: "Cancelar una reserva y confirmar que el evento queda cancelado o eliminado.",
    href: "/admin/reservas",
  },
  {
    id: "google-retry",
    group: "Google Calendar",
    label: "Reintentar sync",
    hint: "Probar el boton de reintento en una reserva con sync pendiente o fallido.",
    href: "/admin/reservas",
  },
  {
    id: "public-mobile-home",
    group: "Experiencia publica",
    label: "Home y listados en movil",
    hint: "Revisar home, clinicas, especialistas y tratamientos desde un movil real.",
    href: "/",
  },
  {
    id: "public-profile-booking",
    group: "Experiencia publica",
    label: "Ficha publica y modal",
    hint: "Entrar a una ficha de especialista y confirmar que el modal se entiende bien.",
    href: "/especialistas",
  },
  {
    id: "patient-account-flow",
    group: "Experiencia publica",
    label: "Cuenta de paciente",
    hint: "Probar login, dashboard, cancelar y reprogramar desde enlaces privados.",
    href: "/mi-cuenta",
  },
  {
    id: "seo-robots-sitemap",
    group: "SEO y produccion",
    label: "Robots y sitemap",
    hint: "Confirmar que el sitemap solo lista paginas publicas y robots bloquea admin/paciente.",
    href: "/admin/configuracion",
  },
  {
    id: "production-env-vars",
    group: "SEO y produccion",
    label: "Variables de produccion",
    hint: "Revisar dominio final, Supabase, email, crons, Google OAuth y timezone.",
    href: "/admin/configuracion",
  },
  {
    id: "real-data-cleanup",
    group: "Contenido real",
    label: "Datos demo fuera",
    hint: "Borrar u ocultar clinicas, especialistas y tratamientos de prueba antes de publicar.",
    href: "/admin/clinicas",
  },
  {
    id: "real-data-prices",
    group: "Contenido real",
    label: "Precios y duraciones",
    hint: "Confirmar precios, duraciones, buffers y limites diarios por especialista.",
    href: "/admin/especialistas",
  },
  {
    id: "payment-model",
    group: "Negocio",
    label: "Modelo de pagos",
    hint: "Decidir si se cobra por comision, suscripcion, lead verificado o modelo mixto.",
    href: "/admin/finanzas",
  },
  {
    id: "clinic-onboarding",
    group: "Negocio",
    label: "Alta de clinicas",
    hint: "Definir proceso final para aprobar admin de clinica y especialistas asociados.",
    href: "/admin/admins",
  },
];

function readStoredChecks() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((item) => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

export default function AdminManualQaChecklist() {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCheckedIds(readStoredChecks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(checkedIds))
    );
  }, [checkedIds, hydrated]);

  const groupedItems = useMemo(
    () =>
      qaItems.reduce<Record<string, QaItem[]>>((groups, item) => {
        groups[item.group] = [...(groups[item.group] || []), item];
        return groups;
      }, {}),
    []
  );
  const completed = qaItems.filter((item) => checkedIds.has(item.id)).length;
  const score = Math.round((completed / qaItems.length) * 100);

  function toggleItem(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function resetChecklist() {
    setCheckedIds(new Set());
  }

  return (
    <section className="mt-10 rounded-[40px] border border-black/10 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            QA manual
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Pruebas antes de publicar
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Marca estas pruebas cuando las hagas con datos reales o semi reales.
            Se guardan en este navegador y no afectan a Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetChecklist}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-black"
          >
            Reiniciar
          </button>
          <div className="rounded-3xl bg-black px-6 py-5 text-white">
            <div className="text-sm uppercase tracking-[0.2em] text-white/60">
              QA
            </div>
            <div className="mt-2 text-4xl font-semibold">{score}%</div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5">
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group} className="rounded-3xl border border-black/5 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {group}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {items.filter((item) => checkedIds.has(item.id)).length}/
                  {items.length} probadas
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {items.map((item) => {
                const done = checkedIds.has(item.id);

                return (
                  <label
                    key={item.id}
                    className={`flex h-full cursor-pointer items-start gap-4 rounded-3xl border p-5 transition ${
                      done
                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                        : "border-sky-100 bg-sky-50 text-sky-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleItem(item.id)}
                      className="mt-1 h-5 w-5 accent-black"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span className="mt-2 block text-sm opacity-75">
                        {item.hint}
                      </span>
                      {item.href && (
                        <a
                          href={item.href}
                          className="mt-3 inline-flex text-sm font-medium underline underline-offset-4"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Abrir seccion
                        </a>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
