"use client";

import { useState } from "react";

import { showAdminToast } from "@/components/AdminToast";

type BookingGoogleFields = {
  google_calendar_event_id?: string | null;
  google_calendar_sync_status?: string | null;
  google_calendar_synced_at?: string | null;
  google_calendar_last_error?: string | null;
};

export default function GoogleCalendarSyncButton({
  bookingId,
  className,
  onSynced,
}: {
  bookingId: string | number;
  className?: string;
  onSynced?: (booking: BookingGoogleFields) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function syncBooking() {
    setLoading(true);

    const response = await fetch("/api/google-calendar/sync-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      showAdminToast(data.error || "No se pudo sincronizar con Google", "error");
      return;
    }

    if (data.result?.error) {
      showAdminToast("Google Calendar devolvio un error", "error");
    } else if (data.result?.skipped) {
      showAdminToast("No hay Google Calendar conectado para este especialista", "error");
    } else {
      showAdminToast("Reserva sincronizada con Google", "success");
    }

    if (data.booking) {
      onSynced?.(data.booking);
    }
  }

  return (
    <button
      type="button"
      onClick={syncBooking}
      disabled={loading}
      className={
        className ||
        "rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-neutral-700 transition hover:border-black disabled:opacity-50"
      }
    >
      {loading ? "Sincronizando..." : "Reintentar sync"}
    </button>
  );
}
