"use client";

import { useEffect, useState } from "react";

import AdminLoadingOverlay from "@/components/AdminLoadingOverlay";
import {
  ADMIN_ACCESS_ROLES,
  ADMIN_PERMISSION_OPTIONS,
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

export default function AddAdminForm() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("staff");

  const [accessRole, setAccessRole] =
    useState("clinic_manager");

  const [clinicId, setClinicId] =
    useState("");

  const [specialistId, setSpecialistId] =
    useState("");

  const [permissions, setPermissions] =
    useState<string[]>(["bookings", "calendar"]);

  const [clinics, setClinics] =
    useState<ClinicOption[]>([]);

  const [specialists, setSpecialists] =
    useState<SpecialistOption[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
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
  }, []);

  const selectedClinic = clinics.find((clinic) => String(clinic.id) === clinicId);
  const availableSpecialists = specialists.filter((specialist) => {
    if (!clinicId) return true;

    return (
      String(specialist.clinic_id || "") === clinicId ||
      (selectedClinic?.name && specialist.clinic_name === selectedClinic.name)
    );
  });

  function togglePermission(value: string) {
    setPermissions((current) =>
      current.includes(value)
        ? current.filter((permission) => permission !== value)
        : [...current, value]
    );
  }

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

    if (role !== "super_admin" && accessRole !== "specialist" && !clinicId) {
      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: "Selecciona la clinica asociada",
            type: "error",
          },
        })
      );

      return;
    }

    if (role !== "super_admin" && accessRole === "specialist" && !specialistId) {
      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: "Selecciona el especialista asociado",
            type: "error",
          },
        })
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
          accessRole,
          clinicId,
          specialistId,
          permissions,
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
    setAccessRole("clinic_manager");
    setClinicId("");
    setSpecialistId("");
    setPermissions(["bookings", "calendar"]);
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
              Usuario operativo
            </option>

            <option value="super_admin">
              Superadmin
            </option>

          </select>

          {role !== "super_admin" ? (
            <>
              <select
                value={clinicId}
                onChange={(e) =>
                  {
                    setClinicId(e.target.value);
                    setSpecialistId("");
                  }
                }
                className="rounded-2xl border border-black/10 bg-white p-4 outline-none"
              >
                <option value="">
                  Seleccionar clinica
                </option>

                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                    {clinic.city ? ` - ${clinic.city}` : ""}
                  </option>
                ))}
              </select>

              <select
                value={accessRole}
                onChange={(e) =>
                  {
                    setAccessRole(e.target.value);
                    if (e.target.value !== "specialist") {
                      setSpecialistId("");
                    }
                  }
                }
                className="rounded-2xl border border-black/10 bg-white p-4 outline-none"
              >
                {ADMIN_ACCESS_ROLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              {accessRole === "specialist" ? (
                <select
                  value={specialistId}
                  onChange={(e) => setSpecialistId(e.target.value)}
                  className="rounded-2xl border border-black/10 bg-white p-4 outline-none"
                >
                  <option value="">Especialista asociado</option>
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
            </>
          ) : null}

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
