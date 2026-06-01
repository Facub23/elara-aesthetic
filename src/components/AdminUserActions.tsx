"use client";

import { useState } from "react";

import AdminConfirmModal from "@/components/AdminConfirmModal";
import {
  ADMIN_ACCESS_ROLES,
  ADMIN_PERMISSION_OPTIONS,
} from "@/lib/admin-access";

export default function AdminUserActions({
  adminId,
  currentRole,
  currentAccessRole,
  currentPermissions,
  currentClinicId,
  currentSpecialistId,
  specialists,
  isCurrentUser,
}: {
  adminId: string;
  currentRole: string;
  currentAccessRole: string;
  currentPermissions: string[];
  currentClinicId: number | null;
  currentSpecialistId: string | null;
  specialists: {
    id: string | number;
    name: string;
    clinic_id?: number | null;
    clinic_name?: string | null;
  }[];
  isCurrentUser: boolean;
}) {
  const [role, setRole] =
    useState(currentRole);

  const [accessRole, setAccessRole] =
    useState(currentAccessRole);

  const [permissions, setPermissions] =
    useState(currentPermissions);

  const [specialistId, setSpecialistId] =
    useState(currentSpecialistId ? String(currentSpecialistId) : "");

  const [loading, setLoading] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  function togglePermission(value: string) {
    setPermissions((current) =>
      current.includes(value)
        ? current.filter((permission) => permission !== value)
        : [...current, value]
    );
  }

  async function updateAccess(
    nextRole = role,
    nextAccessRole = accessRole,
    nextPermissions = permissions,
    nextSpecialistId = specialistId
  ) {
    const previousRole = role;
    const previousAccessRole = accessRole;
    const previousPermissions = permissions;
    const previousSpecialistId = specialistId;
    setRole(nextRole);
    setAccessRole(nextAccessRole);
    setPermissions(nextPermissions);
    setSpecialistId(nextSpecialistId);

    setLoading(true);

    const res = await fetch(
      "/api/update-admin-role",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          adminId,
          role: nextRole,
          accessRole: nextAccessRole,
          permissions: nextPermissions,
          clinicId: currentClinicId,
          specialistId: nextSpecialistId,
        }),
      }
    );

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRole(previousRole);
      setAccessRole(previousAccessRole);
      setPermissions(previousPermissions);
      setSpecialistId(previousSpecialistId);

      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: data.error || "No se pudo actualizar el acceso",
            type: "error",
          },
        })
      );

      return;
    }

    window.dispatchEvent(
      new CustomEvent("admin-toast", {
        detail: {
          message: "Acceso actualizado",
          type: "success",
        },
      })
    );
  }

  async function resetPassword() {

    const password =
      prompt(
        "Nueva contrasena"
      );

    if (!password) return;

    setLoading(true);

    const res = await fetch(
      "/api/reset-admin-password",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          adminId,
          password,
        }),
      }
    );

    setLoading(false);

    if (!res.ok) {

      window.dispatchEvent(
        new CustomEvent(
          "admin-toast",
          {
            detail: {
              message:
                "Error actualizando contrasena",
              type: "error",
            },
          }
        )
      );

      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "admin-toast",
        {
          detail: {
            message:
              "Contrasena actualizada",
            type: "success",
          },
        }
      )
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">

        <select
          value={role}
          disabled={loading || isCurrentUser}
          onChange={(e) =>
            updateAccess(e.target.value)
          }
          className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
        >

          <option value="staff">
            Usuario operativo
          </option>

          <option value="super_admin">
            Superadmin
          </option>

        </select>

        {role !== "super_admin" ? (
          <select
            value={accessRole}
            disabled={loading}
            onChange={(e) =>
              updateAccess(
                role,
                e.target.value,
                permissions,
                e.target.value === "specialist" ? specialistId : ""
              )
            }
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
          >
            {ADMIN_ACCESS_ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : null}

        {role !== "super_admin" && accessRole === "specialist" ? (
          <select
            value={specialistId}
            disabled={loading}
            onChange={(e) =>
              updateAccess(role, accessRole, permissions, e.target.value)
            }
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
          >
            <option value="">Especialista asociado</option>
            {specialists
              .filter((specialist) => {
                if (!currentClinicId) return true;

                return Number(specialist.clinic_id || 0) === Number(currentClinicId);
              })
              .map((specialist) => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.name}
                  {specialist.clinic_name ? ` - ${specialist.clinic_name}` : ""}
                </option>
              ))}
          </select>
        ) : null}

        <button
          onClick={resetPassword}
          disabled={loading}
          className="rounded-full bg-blue-500 px-5 py-3 text-sm text-white disabled:opacity-50"
        >
          Cambiar contrasena
        </button>

        <button
          onClick={() =>
            setDeleteOpen(true)
          }
          disabled={loading || isCurrentUser}
          className="rounded-full bg-red-500 px-5 py-3 text-sm text-white disabled:opacity-50"
        >
          Eliminar
        </button>

        {isCurrentUser ? (
          <span className="self-center text-xs text-neutral-500">
            Tu cuenta actual
          </span>
        ) : null}

      </div>

      {role !== "super_admin" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {ADMIN_PERMISSION_OPTIONS.map((permission) => (
            <button
              key={permission.value}
              type="button"
              disabled={loading}
              onClick={() => {
                const nextPermissions = permissions.includes(permission.value)
                  ? permissions.filter((value) => value !== permission.value)
                  : [...permissions, permission.value];

                togglePermission(permission.value);
                updateAccess(role, accessRole, nextPermissions);
              }}
              className={`rounded-full border px-4 py-2 text-xs transition disabled:opacity-50 ${
                permissions.includes(permission.value)
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white text-neutral-600"
              }`}
            >
              {permission.label}
            </button>
          ))}
        </div>
      ) : null}

      <AdminConfirmModal
        open={deleteOpen}
        title="Eliminar admin"
        description="Esta acción eliminará el administrador del sistema."
        confirmText="Eliminar"
        loading={loading}
        onClose={() =>
          setDeleteOpen(false)
        }
        onConfirm={async () => {

          setLoading(true);

          const res = await fetch(
            "/api/delete-admin",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                adminId,
              }),
            }
          );

          setLoading(false);

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            window.dispatchEvent(
              new CustomEvent("admin-toast", {
                detail: {
                  message: data.error || "No se pudo eliminar el admin",
                  type: "error",
                },
              })
            );

            return;
          }

          setDeleteOpen(false);

          window.dispatchEvent(
            new CustomEvent(
              "admin-toast",
              {
                detail: {
                  message:
                    "Admin eliminado",
                  type: "success",
                },
              }
            )
          );

        
        }}
      />
    </>
  );
}
