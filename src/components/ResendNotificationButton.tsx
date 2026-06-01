"use client";

import { useState } from "react";

import { showAdminToast } from "@/components/AdminToast";

export default function ResendNotificationButton({
  deliveryId,
  channel,
}: {
  deliveryId: string;
  channel: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setLoading(true);

    const res = await fetch("/api/resend-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: deliveryId,
      }),
    });

    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok || !data.success) {
      showAdminToast(
        data.error || "No se pudo reenviar la notificacion",
        "error"
      );
      return;
    }

    showAdminToast(
      data.status === "sent"
        ? "Notificacion reenviada"
        : `${channel} registrado como pendiente`,
      data.status === "sent" ? "success" : "info"
    );
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={loading}
      className="mt-4 w-full rounded-full bg-black px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Reenviando..." : "Reenviar"}
    </button>
  );
}
