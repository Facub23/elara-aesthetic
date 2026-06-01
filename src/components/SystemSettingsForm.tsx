"use client";

import { useState } from "react";

import AdminLoadingOverlay from "@/components/AdminLoadingOverlay";

type Settings = {
  brand_name: string;
  main_whatsapp: string;
  main_email: string;
  opening_time: string;
  closing_time: string;
  appointment_duration: number;
};

export default function SystemSettingsForm({
  settings,
}: {
  settings: Settings;
}) {
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(false);

  async function saveSettings() {
    setLoading(true);

    const res = await fetch("/api/update-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: "Error guardando configuración",
            type: "error",
          },
        })
      );

      return;
    }

    window.dispatchEvent(
      new CustomEvent("admin-toast", {
        detail: {
          message: "Configuración guardada",
          type: "success",
        },
      })
    );
  }

  return (
    <>
      <AdminLoadingOverlay show={loading} text="Guardando configuración..." />

      <div className="mt-12 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Marca
        </p>

        <div className="mt-8 grid gap-6">
          <div>
            <label className="text-sm text-neutral-500">
              Nombre de la marca
            </label>

            <input
              value={form.brand_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  brand_name: e.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">
              WhatsApp principal
            </label>

            <input
              value={form.main_whatsapp}
              onChange={(e) =>
                setForm({
                  ...form,
                  main_whatsapp: e.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">
              Email principal
            </label>

            <input
              value={form.main_email}
              onChange={(e) =>
                setForm({
                  ...form,
                  main_email: e.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Agenda
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <label className="text-sm text-neutral-500">
              Hora apertura
            </label>

            <input
              type="time"
              value={form.opening_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  opening_time: e.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">
              Hora cierre
            </label>

            <input
              type="time"
              value={form.closing_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  closing_time: e.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">
              Duración cita minutos
            </label>

            <input
              type="number"
              value={form.appointment_duration}
              onChange={(e) =>
                setForm({
                  ...form,
                  appointment_duration: Number(e.target.value),
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Sistema
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </>
  );
}
