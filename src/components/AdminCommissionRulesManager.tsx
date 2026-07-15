"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { showAdminToast } from "@/components/AdminToast";

type CommissionRule = {
  id: string;
  target_type: "clinic" | "specialist";
  target_id?: string | null;
  target_name: string;
  commission_rate: number | string;
  notes?: string | null;
};

type TargetOption = {
  type: "clinic" | "specialist";
  id?: string | number | null;
  name: string;
  detail?: string | null;
};

function formatTargetValue(option: TargetOption) {
  return `${option.type}|${option.id || ""}|${option.name}`;
}

function getTargetLabel(type: string) {
  return type === "clinic" ? "Clinica" : "Especialista";
}

export default function AdminCommissionRulesManager({
  rules,
  clinics,
  specialists,
}: {
  rules: CommissionRule[];
  clinics: TargetOption[];
  specialists: TargetOption[];
}) {
  const router = useRouter();
  const options = [...clinics, ...specialists];
  const [target, setTarget] = useState(options[0] ? formatTargetValue(options[0]) : "");
  const [commissionRate, setCommissionRate] = useState("15");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function saveRule() {
    if (!target) {
      showAdminToast("Selecciona una clinica o especialista", "error");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/upsert-commission-rule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        commission_rate: commissionRate,
        notes,
      }),
    });
    const data = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok) {
      showAdminToast(data.error || "No se pudo guardar la comision", "error");
      return;
    }

    showAdminToast("Comision guardada", "success");
    setNotes("");
    router.refresh();
  }

  async function deleteRule(id: string) {
    setDeletingId(id);

    const response = await fetch("/api/delete-commission-rule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    const data = await response.json().catch(() => ({}));

    setDeletingId(null);

    if (!response.ok) {
      showAdminToast(data.error || "No se pudo eliminar la comision", "error");
      return;
    }

    showAdminToast("Comision eliminada", "success");
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-[32px] border border-black/5 bg-white/80 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            Comisiones personalizadas
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Porcentaje por clinica o especialista
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-500">
            No hay comision global. Cada clinica o especialista debe tener su
            porcentaje propio para calcular comisiones sobre reservas
            completadas.
          </p>
        </div>
        <span className="w-fit rounded-full bg-black px-5 py-3 text-sm text-white">
          {rules.length} reglas activas
        </span>
      </div>

      <div className="mt-7 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-[#F7F5F2] px-4 text-sm outline-none"
        >
          {options.length === 0 ? (
            <option value="">Carga clinicas o especialistas reales primero</option>
          ) : (
            options.map((option) => (
              <option key={formatTargetValue(option)} value={formatTargetValue(option)}>
                {getTargetLabel(option.type)} - {option.name}
                {option.detail ? ` (${option.detail})` : ""}
              </option>
            ))
          )}
        </select>

        <input
          value={commissionRate}
          onChange={(event) => setCommissionRate(event.target.value)}
          inputMode="decimal"
          placeholder="%"
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-[#F7F5F2] px-4 text-sm outline-none"
        />

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notas internas opcionales"
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-[#F7F5F2] px-4 text-sm outline-none"
        />

        <button
          type="button"
          onClick={saveRule}
          disabled={loading || options.length === 0}
          className="h-14 w-full min-w-0 rounded-2xl bg-black px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div className="mt-8 divide-y divide-black/5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="grid gap-3 py-5 text-sm md:grid-cols-[0.8fr_minmax(0,1.2fr)_0.4fr_minmax(0,1fr)_auto]"
          >
            <span className="font-medium">{getTargetLabel(rule.target_type)}</span>
            <span className="min-w-0 break-words">{rule.target_name}</span>
            <span className="font-semibold">{Number(rule.commission_rate)}%</span>
            <span className="min-w-0 break-words text-neutral-500">{rule.notes || "Sin notas"}</span>
            <button
              type="button"
              onClick={() => deleteRule(rule.id)}
              disabled={deletingId === rule.id}
              className="w-fit rounded-full border border-black/10 px-4 py-2 text-xs transition hover:border-black disabled:opacity-40"
            >
              {deletingId === rule.id ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        ))}

        {rules.length === 0 && (
          <p className="rounded-2xl bg-[#F7F5F2] p-5 text-sm text-neutral-500">
            Aun no hay comisiones configuradas. Cuando cargues clinicas y
            especialistas reales, asigna un porcentaje a cada uno.
          </p>
        )}
      </div>
    </section>
  );
}
