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
    <section className="mt-7 border-t border-black/10 pt-7">
      <h2 className="text-lg font-semibold">Reprogramar cita</h2>
      <form onSubmit={submitReschedule} className="mt-5 space-y-4">
        <label className="block text-sm text-neutral-600">
          Nueva fecha
          <input
            type="date"
            min={today}
            value={date}
            onChange={(event) => selectDate(event.target.value)}
            className="mt-2 block h-12 w-full rounded-md border border-black/10 bg-white px-4 text-black"
          />
        </label>

        <label className="block text-sm text-neutral-600">
          Horario disponible
          <select
            value={time}
            onChange={(event) => setTime(event.target.value)}
            disabled={loadingSlots || slots.length === 0}
            className="mt-2 block h-12 w-full rounded-md border border-black/10 bg-white px-4 text-black disabled:bg-neutral-100"
          >
            <option value="">
              {loadingSlots ? "Consultando horarios..." : "Selecciona una hora"}
            </option>
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
                {date === currentDate && slot === currentTime ? " (horario actual)" : ""}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

        <button
          type="submit"
          disabled={!time || submitting || (date === currentDate && time === currentTime)}
          className="h-12 w-full rounded-md bg-black px-6 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {submitting ? "Reprogramando..." : "Confirmar nueva fecha"}
        </button>
      </form>
    </section>
  );
}
