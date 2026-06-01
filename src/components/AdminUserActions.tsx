"use client";

import { useState } from "react";

import AdminConfirmModal from "@/components/AdminConfirmModal";

export default function AdminUserActions({
  adminId,
  currentRole,
  isCurrentUser,
}: {
  adminId: string;
  currentRole: string;
  isCurrentUser: boolean;
}) {
  const [role, setRole] =
    useState(currentRole);

  const [loading, setLoading] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  async function updateRole(
    value: string
  ) {
    const previousRole = role;
    setRole(value);

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
          role: value,
        }),
      }
    );

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRole(previousRole);

      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: data.error || "No se pudo actualizar el rol",
            type: "error",
          },
        })
      );

      return;
    }

    window.dispatchEvent(
      new CustomEvent("admin-toast", {
        detail: {
          message: "Rol actualizado",
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
            updateRole(
              e.target.value
            )
          }
          className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
        >

          <option value="staff">
            Equipo operativo
          </option>

          <option value="super_admin">
            Superadmin
          </option>

        </select>

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
