"use client";

import { useState } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import { showAdminToast } from "@/components/AdminToast";

export default function DeleteBookingButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function deleteBooking() {
    setLoading(true);

    const res = await fetch("/api/delete-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bookingId,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      showAdminToast(
        "Error eliminando reserva",
        "error"
      );

      return;
    }

    showAdminToast(
      "Reserva eliminada",
      "success"
    );

    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-red-500 px-4 py-2 text-sm text-white transition hover:bg-red-600"
      >
        Eliminar
      </button>

      <ConfirmDialog
        open={open}
        title="Eliminar reserva"
        description="Esta acción eliminará la reserva del sistema permanentemente."
        confirmText={loading ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        danger
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={deleteBooking}
      />
    </>
  );
}