"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { bookingFilterStatusOptions } from "@/lib/booking-status";

type Option = {
  id?: string | number;
  name: string;
};

export default function BookingOperationsFilters({
  initialSearch,
  currentStatus,
  currentClinic,
  currentSpecialist,
  currentDate,
  clinics,
  specialists,
}: {
  initialSearch: string;
  currentStatus: string;
  currentClinic: string;
  currentSpecialist: string;
  currentDate: string;
  clinics: Option[];
  specialists: Option[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  function getMadridDate() {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Madrid",
    }).format(new Date());
  }

  function updateFilters(next: Record<string, string>) {
    const params = new URLSearchParams();
    const values = {
      search,
      status: currentStatus,
      clinic: currentClinic,
      specialist: currentSpecialist,
      date: currentDate,
      ...next,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== "Todas") {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(query ? `/admin/reservas?${query}` : "/admin/reservas");
  }

  function handleSearch(value: string) {
    setSearch(value);
    updateFilters({
      search: value,
    });
  }

  return (
    <div className="rounded-[36px] border border-white/40 bg-white/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <input
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Buscar paciente, email, clinica, especialista o tratamiento..."
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
        />

        <select
          value={currentStatus || "Todas"}
          onChange={(event) =>
            updateFilters({
              status: event.target.value,
            })
          }
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
        >
          <option value="Todas">Todas</option>
          {bookingFilterStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={currentClinic}
          onChange={(event) =>
            updateFilters({
              clinic: event.target.value,
            })
          }
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
        >
          <option value="">Todas las clinicas</option>
          {clinics.map((clinic) => (
            <option key={clinic.id || clinic.name} value={clinic.name}>
              {clinic.name}
            </option>
          ))}
        </select>

        <select
          value={currentSpecialist}
          onChange={(event) =>
            updateFilters({
              specialist: event.target.value,
            })
          }
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
        >
          <option value="">Todos los especialistas</option>
          {specialists.map((specialist) => (
            <option
              key={specialist.id || specialist.name}
              value={specialist.name}
            >
              {specialist.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={currentDate}
          onChange={(event) =>
            updateFilters({
              date: event.target.value,
            })
          }
          className="h-14 w-full min-w-0 rounded-2xl border border-black/10 bg-white px-5 outline-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/reservas")}
          className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
        >
          Limpiar filtros
        </button>

        <button
          type="button"
          onClick={() =>
            updateFilters({
              date: getMadridDate(),
            })
          }
          className="rounded-full bg-black px-5 py-3 text-sm text-white"
        >
          Ver hoy
        </button>
      </div>
    </div>
  );
}
