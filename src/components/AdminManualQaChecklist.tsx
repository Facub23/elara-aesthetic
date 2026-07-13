"use client";

import { useEffect, useMemo, useState } from "react";

type QaItem = {
  id: string;
  group: string;
  label: string;
  hint: string;
  priority: "critical" | "recommended" | "final";
  href?: string;
};

const STORAGE_KEY = "encuentra-admin-prelaunch-qa-v1";

const qaItems: QaItem[] = [
  {
    id: "public-booking-flow",
    group: "Marketplace publico",
    label: "Reserva desde tratamiento",
    hint: "Entrar a una landing de tratamiento, elegir especialista, fecha, hora y confirmar.",
    priority: "critical",
    href: "/tratamientos",
  },
  {
    id: "public-city-treatment-flow",
    group: "Marketplace publico",
    label: "Reserva desde SEO local",
    hint: "Abrir una pagina tipo /madrid/botox y confirmar que muestra clinicas, especialistas y CTA correctos.",
    priority: "critical",
    href: "/madrid/botox",
  },
  {
    id: "public-independent-specialist",
    group: "Marketplace publico",
    label: "Especialista independiente",
    hint: "Comprobar que un especialista sin clinica muestra direccion de consulta y puede reservarse.",
    priority: "critical",
    href: "/especialistas?practice=Consulta%20independiente",
  },
  {
    id: "public-mobile-home",
    group: "Marketplace publico",
    label: "Home y listados en movil",
    hint: "Revisar home, clinicas, especialistas y tratamientos desde movil real o viewport movil.",
    priority: "recommended",
    href: "/",
  },
  {
    id: "public-treatment-landing",
    group: "Marketplace publico",
    label: "Landing de tratamiento",
    hint: "Validar explicacion, galeria, FAQ, precios y especialistas disponibles para el tratamiento.",
    priority: "recommended",
    href: "/tratamientos/botox",
  },
  {
    id: "public-profile-booking",
    group: "Marketplace publico",
    label: "Ficha publica y modal",
    hint: "Entrar a una ficha de especialista y confirmar que el modal se entiende bien.",
    priority: "recommended",
    href: "/especialistas",
  },
  {
    id: "booking-email",
    group: "Reservas y emails",
    label: "Email de reserva",
    hint: "Confirmar que el paciente recibe el correo correcto.",
    priority: "critical",
    href: "/admin/emails",
  },
  {
    id: "patient-account-flow",
    group: "Reservas y emails",
    label: "Cuenta de paciente",
    hint: "Probar login, dashboard, cancelar y reprogramar desde enlaces privados.",
    priority: "critical",
    href: "/mi-cuenta",
  },
  {
    id: "booking-cancel-token",
    group: "Reservas y emails",
    label: "Cancelacion segura",
    hint: "Abrir un enlace de cancelacion con token y comprobar que solo cancela esa reserva.",
    priority: "critical",
    href: "/cancel-booking",
  },
  {
    id: "booking-reminders",
    group: "Reservas y emails",
    label: "Recordatorios",
    hint: "Confirmar emails de recordatorio y que no se duplican si el cron corre varias veces.",
    priority: "recommended",
    href: "/admin/notificaciones",
  },
  {
    id: "admin-reschedule-availability",
    group: "Reservas admin",
    label: "Reprogramacion con disponibilidad",
    hint: "Comprobar que solo permite dias y horas realmente disponibles.",
    priority: "critical",
    href: "/admin/reservas",
  },
  {
    id: "admin-statuses",
    group: "Reservas admin",
    label: "Estados de cita",
    hint: "Probar pendiente, confirmada, cancelada, no asistio y asistio.",
    priority: "critical",
    href: "/admin/reservas",
  },
  {
    id: "auto-complete",
    group: "Reservas admin",
    label: "Citas pasadas",
    hint: "Verificar que una cita pasada pueda quedar como asistio cuando corresponda.",
    priority: "recommended",
    href: "/admin/reservas",
  },
  {
    id: "admin-booking-detail",
    group: "Reservas admin",
    label: "Detalle de reserva",
    hint: "Abrir una reserva individual y revisar paciente, tratamiento, clinica, historial y acciones.",
    priority: "recommended",
    href: "/admin/reservas",
  },
  {
    id: "availability-hours",
    group: "Disponibilidad real",
    label: "Horarios por especialista",
    hint: "Validar lunes a domingo, descansos, vacaciones, bloqueos, buffers y duracion por tratamiento.",
    priority: "critical",
    href: "/admin/calendar",
  },
  {
    id: "availability-daily-limits",
    group: "Disponibilidad real",
    label: "Limites diarios",
    hint: "Probar que no se ofrecen mas citas que el maximo diario configurado.",
    priority: "critical",
    href: "/admin/calendar",
  },
  {
    id: "availability-blocked-times",
    group: "Disponibilidad real",
    label: "Bloqueos y vacaciones",
    hint: "Bloquear dia, bloquear hora y cargar vacaciones; luego comprobar que desaparecen del modal.",
    priority: "critical",
    href: "/admin/calendar",
  },
  {
    id: "clinic-role-scope",
    group: "Accesos",
    label: "Rol clinica",
    hint: "Entrar con admin de clinica y confirmar que solo ve su clinica.",
    priority: "critical",
    href: "/admin/admins",
  },
  {
    id: "specialist-role-scope",
    group: "Accesos",
    label: "Rol especialista",
    hint: "Entrar con especialista y confirmar que solo ve su agenda.",
    priority: "critical",
    href: "/admin/admins",
  },
  {
    id: "registration-approval",
    group: "Accesos",
    label: "Registro y aprobacion",
    hint: "Crear solicitud de acceso, aprobarla manualmente y comprobar que queda vinculada a clinica o especialista.",
    priority: "critical",
    href: "/admin/admins",
  },
  {
    id: "google-create",
    group: "Google Calendar",
    label: "Crear evento",
    hint: "Hacer una reserva confirmada y comprobar que aparece en Google Calendar.",
    priority: "recommended",
    href: "/admin/calendar",
  },
  {
    id: "google-update",
    group: "Google Calendar",
    label: "Actualizar evento",
    hint: "Reprogramar una reserva y comprobar que cambia el evento externo.",
    priority: "recommended",
    href: "/admin/reservas",
  },
  {
    id: "google-cancel",
    group: "Google Calendar",
    label: "Cancelar evento",
    hint: "Cancelar una reserva y confirmar que el evento queda cancelado o eliminado.",
    priority: "recommended",
    href: "/admin/reservas",
  },
  {
    id: "google-retry",
    group: "Google Calendar",
    label: "Reintentar sync",
    hint: "Probar el boton de reintento en una reserva con sync pendiente o fallido.",
    priority: "recommended",
    href: "/admin/reservas",
  },
  {
    id: "seo-robots-sitemap",
    group: "SEO y produccion",
    label: "Robots y sitemap",
    hint: "Confirmar que el sitemap solo lista paginas publicas y robots bloquea admin/paciente.",
    priority: "critical",
    href: "/admin/configuracion",
  },
  {
    id: "seo-structured-data",
    group: "SEO y produccion",
    label: "Schema y canonicals",
    hint: "Validar Clinic, Specialist, Treatment, FAQ, rutas ciudad/tratamiento y canonicals.",
    priority: "recommended",
    href: "/tratamientos/botox",
  },
  {
    id: "production-env-vars",
    group: "SEO y produccion",
    label: "Variables de produccion",
    hint: "Revisar dominio final, Supabase, email, crons, Google OAuth y timezone.",
    priority: "critical",
    href: "/admin/configuracion",
  },
  {
    id: "legal-pages",
    group: "SEO y produccion",
    label: "Legales base",
    hint: "Revisar aviso legal, privacidad, terminos y cookies antes de abrir al publico.",
    priority: "final",
    href: "/aviso-legal",
  },
  {
    id: "real-data-cleanup",
    group: "Contenido real",
    label: "Datos demo fuera",
    hint: "Borrar u ocultar clinicas, especialistas y tratamientos de prueba antes de publicar.",
    priority: "final",
    href: "/admin/clinicas",
  },
  {
    id: "real-data-prices",
    group: "Contenido real",
    label: "Precios y duraciones",
    hint: "Confirmar precios, duraciones, buffers y limites diarios por especialista.",
    priority: "final",
    href: "/admin/especialistas",
  },
  {
    id: "real-data-images",
    group: "Contenido real",
    label: "Imagenes finales",
    hint: "Revisar que clinicas, especialistas y tratamientos tengan imagenes reales o aprobadas.",
    priority: "final",
    href: "/admin/clinicas",
  },
  {
    id: "payment-model",
    group: "Negocio",
    label: "Modelo de pagos",
    hint: "Decidir si se cobra por comision, suscripcion, lead verificado o modelo mixto.",
    priority: "final",
    href: "/admin/finanzas",
  },
  {
    id: "clinic-onboarding",
    group: "Negocio",
    label: "Alta de clinicas",
    hint: "Definir proceso final para aprobar admin de clinica y especialistas asociados.",
    priority: "final",
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
  const criticalItems = qaItems.filter((item) => item.priority === "critical");
  const criticalCompleted = criticalItems.filter((item) =>
    checkedIds.has(item.id)
  ).length;
  const criticalMissing = criticalItems.length - criticalCompleted;
  const finalItems = qaItems.filter((item) => item.priority === "final");
  const finalCompleted = finalItems.filter((item) =>
    checkedIds.has(item.id)
  ).length;
  const recommendedItems = qaItems.filter(
    (item) => item.priority === "recommended"
  );
  const recommendedCompleted = recommendedItems.filter((item) =>
    checkedIds.has(item.id)
  ).length;

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
            Lo bloqueante valida que el marketplace puede operar; lo final queda
            para antes de cargar contenido definitivo.
          </p>
          <div
            className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm ${
              criticalMissing === 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {criticalMissing === 0
              ? "Flujo base validado para pre-lanzamiento controlado"
              : `${criticalMissing} pruebas bloqueantes pendientes`}
          </div>
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

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          {
            label: "Bloqueantes",
            value: `${criticalCompleted}/${criticalItems.length}`,
            detail: "reservas, accesos, disponibilidad y produccion",
            tone: criticalMissing === 0 ? "good" : "bad",
          },
          {
            label: "Recomendadas",
            value: `${recommendedCompleted}/${recommendedItems.length}`,
            detail: "experiencia premium y sincronizaciones",
            tone: "neutral",
          },
          {
            label: "Finales",
            value: `${finalCompleted}/${finalItems.length}`,
            detail: "contenido real, legales y modelo comercial",
            tone: finalCompleted === finalItems.length ? "good" : "warn",
          },
        ].map((card) => (
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
                        : item.priority === "critical"
                          ? "border-red-100 bg-red-50 text-red-800"
                          : item.priority === "final"
                            ? "border-amber-100 bg-amber-50 text-amber-900"
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
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-black">
                          {done
                            ? "OK"
                            : item.priority === "critical"
                              ? "Bloquea"
                              : item.priority === "final"
                                ? "Final"
                                : "Revisar"}
                        </span>
                      </span>
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
