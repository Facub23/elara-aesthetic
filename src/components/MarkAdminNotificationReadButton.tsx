"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { showAdminToast } from "@/components/AdminToast";

export default function MarkAdminNotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAsRead() {
    setLoading(true);

    const response = await fetch("/api/mark-admin-notification-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: notificationId,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok || !data.success) {
      showAdminToast(data.error || "No se pudo marcar como leida", "error");
      return;
    }

    showAdminToast("Alerta marcada como leida", "success");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={markAsRead}
      disabled={loading}
      className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
    >
      {loading ? "Marcando..." : "Marcar leida"}
    </button>
  );
}
