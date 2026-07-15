"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  ADMIN_ACCESS_ROLES,
  ADMIN_PERMISSION_OPTIONS,
  isSpecialistAccessRole,
} from "@/lib/admin-access";

type ClinicOption = {
  id: number;
  name: string;
  city?: string | null;
};

type SpecialistOption = {
  id: string | number;
  name: string;
  clinic_id?: number | null;
  clinic_name?: string | null;
};

export default function AdminAccessRequestForm() {
  const [open, setOpen] = useState(false);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    clinicId: "",
    clinicName: "",
    accessRole: "clinic_manager",
    specialistId: "",
    message: "",
  });
  const [permissions, setPermissions] = useState<string[]>([
    "bookings",
    "calendar",
  ]);

  useEffect(() => {
    if (!open) return;

    fetch("/api/public-marketplace-data")
      .then((response) => response.json())
      .then((data) => {
        setClinics(data.clinics || []);
        setSpecialists(data.specialists || []);
      })
      .catch(() => {
        setClinics([]);
        setSpecialists([]);
      });
  }, [open]);

  function updateField(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "clinicId" ? { specialistId: "" } : {}),
      ...(name === "accessRole" && !isSpecialistAccessRole(value)
        ? { specialistId: "" }
        : {}),
    }));
  }

  const selectedClinic = clinics.find(
    (clinic) => String(clinic.id) === form.clinicId
  );
  const availableSpecialists = specialists.filter((specialist) => {
    if (form.accessRole === "independent_specialist") {
      return !specialist.clinic_id && !specialist.clinic_name;
    }

    if (form.accessRole === "specialist" && !form.clinicId) {
      return Boolean(specialist.clinic_id || specialist.clinic_name);
    }

    if (!form.clinicId && !form.clinicName) return true;

    const sameClinicId =
      form.clinicId &&
      specialist.clinic_id &&
      String(specialist.clinic_id) === form.clinicId;
    const sameClinicName =
      selectedClinic?.name && specialist.clinic_name === selectedClinic.name;

    return Boolean(sameClinicId || sameClinicName);
  });

  function togglePermission(value: string) {
    setPermissions((current) =>
      current.includes(value)
        ? current.filter((permission) => permission !== value)
        : [...current, value]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/request-admin-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        permissions,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "No pudimos enviar la solicitud.");
      return;
    }

    setSent(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 w-full rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm font-medium transition hover:border-black"
      >
        Solicitar acceso para mi clinica
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-[28px] border border-black/10 bg-[#F7F5F2] p-5">
      {sent ? (
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">
            Solicitud enviada
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">
            La revisaremos manualmente.
          </h3>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Si todo esta correcto, un superadmin aprobara el acceso y te
            compartira las credenciales iniciales.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">
              Solicitud de acceso
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Para clinicas, especialistas y equipo interno. El acceso queda
              pendiente hasta aprobacion manual.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Nombre completo"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            />
            <input
              placeholder="Telefono"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            />
            <input
              placeholder="Clinica o empresa"
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <select
            value={form.clinicId}
            onChange={(event) => updateField("clinicId", event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          >
            <option value="">Clinica pendiente de asignar</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
                {clinic.city ? ` - ${clinic.city}` : ""}
              </option>
            ))}
          </select>

          {!form.clinicId ? (
            <input
              placeholder="Nombre de la clinica si aun no aparece"
              value={form.clinicName}
              onChange={(event) =>
                updateField("clinicName", event.target.value)
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            />
          ) : null}

          <select
            value={form.accessRole}
            onChange={(event) => updateField("accessRole", event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          >
            {ADMIN_ACCESS_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {isSpecialistAccessRole(form.accessRole) ? (
            <select
              required
              value={form.specialistId}
              onChange={(event) =>
                updateField("specialistId", event.target.value)
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="">Selecciona tu perfil de especialista</option>
              {availableSpecialists.map((specialist) => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.name}
                  {specialist.clinic_name ? ` - ${specialist.clinic_name}` : ""}
                </option>
              ))}
            </select>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {ADMIN_PERMISSION_OPTIONS.map((permission) => (
              <label
                key={permission.value}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(permission.value)}
                  onChange={() => togglePermission(permission.value)}
                />
                {permission.label}
              </label>
            ))}
          </div>

          <textarea
            placeholder="Mensaje opcional"
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 rounded-2xl bg-black text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 rounded-2xl border border-black/10 px-5 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
