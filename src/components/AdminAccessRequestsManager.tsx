"use client";

import { useState } from "react";

import {
  ADMIN_ACCESS_ROLES,
  ADMIN_PERMISSION_OPTIONS,
  getAccessRoleLabel,
  getPermissionLabel,
} from "@/lib/admin-access";

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  requested_clinic_id?: number | null;
  requested_clinic_name?: string | null;
  requested_access_role: string;
  requested_permissions?: string[] | null;
  message?: string | null;
  status: string;
  created_at: string;
};

type ClinicOption = {
  id: number;
  name: string;
  city?: string | null;
};

export default function AdminAccessRequestsManager({
  initialRequests,
  clinics,
}: {
  initialRequests: AccessRequest[];
  clinics: ClinicOption[];
}) {
  const [requests, setRequests] = useState(initialRequests);

  function removeRequest(id: string) {
    setRequests((current) => current.filter((request) => request.id !== id));
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-[28px] bg-[#F7F5F2] p-8 text-center text-neutral-500">
        No hay solicitudes pendientes.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {requests.map((request) => (
        <AccessRequestCard
          key={request.id}
          request={request}
          clinics={clinics}
          onResolved={() => removeRequest(request.id)}
        />
      ))}
    </div>
  );
}

function AccessRequestCard({
  request,
  clinics,
  onResolved,
}: {
  request: AccessRequest;
  clinics: ClinicOption[];
  onResolved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState("staff");
  const [accessRole, setAccessRole] = useState(request.requested_access_role);
  const [clinicId, setClinicId] = useState(
    request.requested_clinic_id ? String(request.requested_clinic_id) : ""
  );
  const [permissions, setPermissions] = useState<string[]>(
    request.requested_permissions || []
  );

  function togglePermission(value: string) {
    setPermissions((current) =>
      current.includes(value)
        ? current.filter((permission) => permission !== value)
        : [...current, value]
    );
  }

  async function review(action: "approved" | "rejected") {
    if (action === "approved" && password.length < 8) {
      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: "Define una contrasena temporal de al menos 8 caracteres",
            type: "error",
          },
        })
      );
      return;
    }

    setLoading(true);

    const response = await fetch("/api/review-admin-access-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: request.id,
        action,
        password,
        systemRole,
        accessRole,
        clinicId,
        permissions,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: data.error || "No se pudo revisar la solicitud",
            type: "error",
          },
        })
      );
      return;
    }

    window.dispatchEvent(
      new CustomEvent("admin-toast", {
        detail: {
          message:
            action === "approved"
              ? "Acceso aprobado y usuario creado"
              : "Solicitud rechazada",
          type: "success",
        },
      })
    );
    onResolved();
  }

  return (
    <div className="rounded-[28px] bg-[#F7F5F2] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
            {new Date(request.created_at).toLocaleDateString("es-ES")}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            {request.name}
          </h3>
          <p className="mt-2 text-sm text-neutral-500">{request.email}</p>
          {request.phone ? (
            <p className="mt-1 text-sm text-neutral-500">{request.phone}</p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
          {getAccessRoleLabel(request.requested_access_role)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <span className="font-medium text-black">Clinica: </span>
          {request.company ||
            request.requested_clinic_name ||
            clinics.find((clinic) => clinic.id === request.requested_clinic_id)
              ?.name ||
            "Pendiente"}
        </div>
        <div className="rounded-2xl bg-white p-4">
          <span className="font-medium text-black">Permisos pedidos: </span>
          {(request.requested_permissions || [])
            .map((permission) => getPermissionLabel(permission))
            .join(", ") || "Sin permisos concretos"}
        </div>
      </div>

      {request.message ? (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-neutral-600">
          {request.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <select
          value={clinicId}
          onChange={(event) => setClinicId(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="">Sin clinica asignada</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
              {clinic.city ? ` - ${clinic.city}` : ""}
            </option>
          ))}
        </select>

        <select
          value={accessRole}
          onChange={(event) => setAccessRole(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
        >
          {ADMIN_ACCESS_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <select
          value={systemRole}
          onChange={(event) => setSystemRole(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="staff">Usuario operativo</option>
          <option value="super_admin">Superadmin</option>
        </select>

        <input
          type="password"
          placeholder="Contrasena temporal"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => review("approved")}
          disabled={loading}
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          Aprobar acceso
        </button>
        <button
          type="button"
          onClick={() => review("rejected")}
          disabled={loading}
          className="rounded-full border border-black/10 px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
