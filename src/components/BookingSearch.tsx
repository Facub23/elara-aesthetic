"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BookingSearch({
  initialSearch,
}: {
  initialSearch: string;
}) {
  const router = useRouter();

  const [search, setSearch] =
    useState(initialSearch);

  function handleSearch(
    value: string
  ) {
    setSearch(value);

    if (!value) {
      router.push("/admin/reservas");
      return;
    }

    router.push(
      `/admin/reservas?search=${encodeURIComponent(
        value
      )}`
    );
  }

  return (
    <input
      value={search}
      onChange={(e) =>
        handleSearch(
          e.target.value
        )
      }
      placeholder="Buscar paciente, clínica, especialista o tratamiento..."
      className="w-full rounded-[24px] border border-black/10 bg-white px-6 py-4 outline-none"
    />
  );
}