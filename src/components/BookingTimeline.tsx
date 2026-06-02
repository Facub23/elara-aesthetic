"use client";

import { useState } from "react";

type BookingEvent = {
  id: string | number;
  event_type: string;
  actor_type: "patient" | "admin" | "system";
  resulting_status?: string | null;
  description?: string | null;
  metadata?: {
    previous_date?: string | null;
    previous_time?: string | null;
    next_date?: string | null;
    next_time?: string | null;
    reminder?: string | null;
  } | null;
  created_at: string;
};

const labels: Record<string, string> = {
  created: "Solicitud creada",
  created_manual: "Reserva creada manualmente",
  confirmed: "Reserva confirmada",
  rescheduled: "Cita reprogramada",
  cancelled: "Cita cancelada",
  expired: "Solicitud expirada",
  completed: "Tratamiento completado",
  status_changed: "Estado actualizado",
  reminder_sent: "Recordatorio enviado",
  review_requested: "Opinion solicitada",
  imported: "Reserva registrada",
  google_calendar_sync: "Google Calendar",
};

function actorLabel(actor: BookingEvent["actor_type"]) {
  if (actor === "patient") return "Paciente";
  if (actor === "admin") return "Administracion";
  return "Sistema";
}

export default function BookingTimeline({
  bookingId,
}: {
  bookingId: string | number;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function showTimeline() {
    setOpen(true);
    setLoading(true);
    setError("");

    const response = await fetch(
      `/api/booking-events?bookingId=${encodeURIComponent(String(bookingId))}`
    );
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "No se pudo cargar el historial");
      setLoading(false);
      return;
    }

    setEvents(data.events || []);
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={showTimeline}
        className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-neutral-700 transition hover:border-black/25"
      >
        Historial
      </button>

      {open && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Reserva #{bookingId}
                </p>
                <h2 className="mt-3 text-3xl font-semibold">Historial</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"
                aria-label="Cerrar historial"
              >
                x
              </button>
            </div>

            {loading && <p className="mt-8 text-neutral-500">Cargando historial...</p>}
            {error && <p className="mt-8 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>}

            {!loading && !error && events.length === 0 && (
              <p className="mt-8 rounded-md bg-[#F7F5F2] p-4 text-neutral-500">
                Todavia no hay eventos registrados.
              </p>
            )}

            <div className="mt-8 space-y-3">
              {events.map((event) => (
                <div key={event.id} className="rounded-md bg-[#F7F5F2] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium">
                      {labels[event.event_type] || event.event_type}
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {actorLabel(event.actor_type)}
                    </div>
                  </div>
                  {event.description && (
                    <p className="mt-2 text-sm text-neutral-600">{event.description}</p>
                  )}
                  {event.metadata?.previous_date && event.metadata?.next_date && (
                    <p className="mt-2 text-sm text-sky-700">
                      {event.metadata.previous_date} {event.metadata.previous_time || ""}
                      {" -> "}
                      {event.metadata.next_date} {event.metadata.next_time || ""}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-400">
                    {new Date(event.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
