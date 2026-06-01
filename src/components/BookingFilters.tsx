"use client";

import { useRouter } from "next/navigation";

const bookingStatuses = [
  "Todas",
  "Pendiente",
  "Pendiente confirmación",
  "Confirmada",
  "Reprogramada",
  "Completada",
  "Cancelada",
  "No asistió",
];

export default function BookingFilters({
  currentFilter,
}: {
  currentFilter: string;
}) {
  const router = useRouter();

  function updateFilter(filter: string) {
    if (filter === "Todas") {
      router.push("/admin/reservas");
      return;
    }

    router.push(
      `/admin/reservas?status=${encodeURIComponent(filter)}`
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {bookingStatuses.map((filter) => (
        <button
          key={filter}
          onClick={() => updateFilter(filter)}
          className={`rounded-full px-5 py-3 text-sm transition-all duration-300 ${
            currentFilter === filter ||
            (filter === "Todas" && !currentFilter)
              ? "bg-black text-white shadow-lg"
              : "border border-black/5 bg-white/70 text-black hover:bg-black hover:text-white"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}