"use client";

import { useState } from "react";

export default function AddPatientNote({
  patientName,
}: {
  patientName: string;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const cleanNote = note.trim();

    if (!cleanNote) return;

    setError("");
    setLoading(true);

    const response = await fetch("/api/create-patient-note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_name: patientName,
        note: cleanNote,
      }),
    });

    if (!response.ok) {
      setLoading(false);
      setError("Error guardando nota. Intentalo de nuevo.");
      return;
    }

    setNote("");
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="rounded-[32px] border border-black/5 bg-[#F7F5F2] p-6">
      <div className="flex flex-col gap-2">
        <div className="text-xl font-semibold">Nueva nota privada</div>
        <p className="text-sm text-neutral-500">
          Anade observaciones internas visibles solo para el equipo.
        </p>
      </div>

      <textarea
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setError("");
        }}
        placeholder="Ej: Prefiere horarios de tarde, confirmo por WhatsApp, interesada en seguimiento..."
        className="mt-5 h-36 w-full resize-none rounded-[24px] border border-black/10 bg-white p-5 outline-none transition focus:border-black"
      />

      {error && (
        <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-sm text-neutral-400">{note.trim().length} caracteres</div>
        <button
          onClick={handleSubmit}
          disabled={loading || !note.trim()}
          className="rounded-full bg-black px-7 py-3 text-sm text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Guardando..." : "Guardar nota"}
        </button>
      </div>
    </div>
  );
}
