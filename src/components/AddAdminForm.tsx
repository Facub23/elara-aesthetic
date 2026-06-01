"use client";

import { useState } from "react";

import AdminLoadingOverlay from "@/components/AdminLoadingOverlay";

export default function AddAdminForm() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("staff");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit() {

    if (!email || !password) {

      window.dispatchEvent(
        new CustomEvent(
          "admin-toast",
          {
            detail: {
              message:
                "Completa email y password",
              type: "error",
            },
          }
        )
      );

      return;
    }

    setLoading(true);

    const res = await fetch(
      "/api/create-admin",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email,
          password,
          role,
        }),
      }
    );

    setLoading(false);

    if (!res.ok) {

      const data =
        await res.json();

      window.dispatchEvent(
        new CustomEvent(
          "admin-toast",
          {
            detail: {
              message:
                data?.error?.message ||
                "Error creando admin",

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
              "Admin creado correctamente",

            type: "success",
          },
        }
      )
    );

    setEmail("");
    setPassword("");
    setRole("staff");
  }

  return (
    <>
      <AdminLoadingOverlay
        show={loading}
        text="Creando administrador..."
      />

      <div className="rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">

        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Nuevo admin
        </p>

        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Agregar administrador
        </h2>

        <div className="mt-8 grid gap-4">

          <input
            placeholder="Email del admin"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            className="rounded-2xl border border-black/10 bg-white p-4 outline-none"
          />

          <input
            type="password"
            placeholder="Password temporal"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="rounded-2xl border border-black/10 bg-white p-4 outline-none"
          />

          <select
            value={role}
            onChange={(e) =>
              setRole(
                e.target.value
              )
            }
            className="rounded-2xl border border-black/10 bg-white p-4 outline-none"
          >

            <option value="staff">
              Equipo operativo
            </option>

            <option value="super_admin">
              Superadmin
            </option>

          </select>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
          >
            {loading
              ? "Creando..."
              : "Crear admin"}
          </button>

        </div>

      </div>
    </>
  );
}
