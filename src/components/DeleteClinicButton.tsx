"use client";

import { useState } from "react";

import AdminConfirmModal from "@/components/AdminConfirmModal";
import AdminLoadingOverlay from "@/components/AdminLoadingOverlay";

export default function DeleteClinicButton({
  clinicId,
}: {
  clinicId: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);

    const res = await fetch("/api/delete-clinic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clinicId,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: "Error eliminando clínica",
            type: "error",
          },
        })
      );

      return;
    }

    window.dispatchEvent(
      new CustomEvent("admin-toast", {
        detail: {
          message: "Clínica eliminada",
          type: "success",
        },
      })
    );

    setOpen(false);
  }

  return (
    <>
      <AdminLoadingOverlay show={loading} text="Eliminando clínica..." />

      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-red-500 px-5 py-3 text-sm text-white"
      >
        Eliminar
      </button>

      <AdminConfirmModal
        open={open}
        title="Eliminar clínica"
        description="Esta acción eliminará la clínica del sistema."
        confirmText="Eliminar"
        loading={loading}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}