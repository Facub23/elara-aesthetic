"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  currentDate: string;
  currentTime: string;
};

type AvailabilityResponse = {
  availableSlots?: string[];
  blocked?: boolean;
  reason?: string;
  error?: string;
};

export default function ManageBookingReschedule({
  token,
  currentDate,
  currentTime,
}: Props) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(currentDate >= today ? currentDate : today);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/manage-booking/available-slots?token=${encodeURIComponent(token)}&date=${encodeURIComponent(date)}`
    )
      .then(async (response) => {
        const data = (await response.json()) as AvailabilityResponse;
        if (!response.ok) throw new Error(data.error || "No se pudo consultar la disponibilidad");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setSlots(data.availableSlots || []);
        if (data.blocked || (data.availableSlots || []).length === 0) {
          setError(data.reason || "No hay horarios disponibles para esta fecha.");
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) {
          setSlots([]);
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, token]);

  function selectDate(value: string) {
    setDate(value);
    setTime("");
    setSlots([]);
    setError("");
    setMessage("");
    setLoadingSlots(true);
  }

  async function submitReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!time || submitting) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/manage-booking/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, date, time }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "No se pudo reprogramar la cita");
      setSubmitting(false);
      return;
    }

    setMessage("Tu cita ha sido reprogramada. Recibiras la confirmacion por email.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
            Reprogramacion
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Elige un nuevo horario disponible
          </h2>
        </div>

        <div className="rounded-full bg-[#F8F6F2] px-4 py-2 text-xs text-neutral-600">
          Actual: {currentDate} - {currentTime}
        </div>
      </div>

      <form onSubmit={submitReschedule} className="mt-6 space-y-5">
        <label className="block text-sm font-medium text-neutral-700">
          Nueva fecha
          <input
            type="date"
            min={today}
            value={date}
            onChange={(event) => selectDate(event.target.value)}
            className="mt-2 block h-12 w-full rounded-2xl border border-black/10 bg-[#F8F6F2] px-4 text-black outline-none transition focus:border-black"
          />
        </label>

        <div>
          <div className="text-sm font-medium text-neutral-700">
            Horarios disponibles
          </div>

          {loadingSlots ? (
            <div className="mt-3 rounded-2xl border border-black/10 bg-[#F8F6F2] p-4 text-sm text-neutral-600">
              Consultando disponibilidad real...
            </div>
          ) : slots.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const isCurrentSlot = date === currentDate && slot === currentTime;
                const active = time === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isCurrentSlot}
                    onClick={() => {
                      setTime(slot);
                      setError("");
                      setMessage("");
                    }}
                    className={`h-12 rounded-2xl border text-sm font-medium transition ${
                      active
                        ? "border-black bg-black text-white"
                        : isCurrentSlot
                          ? "cursor-not-allowed border-black/5 bg-neutral-100 text-neutral-400"
                          : "border-black/10 bg-white hover:border-black"
                    }`}
                  >
                    {slot}
                    {isCurrentSlot ? " actual" : ""}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              No hay horarios disponibles para esta fecha.
            </div>
          )}
        </div>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}

        <button
          type="submit"
          disabled={!time || submitting || (date === currentDate && time === currentTime)}
          className="h-12 w-full rounded-2xl bg-black px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {submitting ? "Reprogramando..." : "Confirmar nueva fecha"}
        </button>
      </form>
    </section>
  );
}
