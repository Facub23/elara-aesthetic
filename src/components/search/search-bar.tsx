"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export function SearchBar() {
  const router = useRouter();

  const [city, setCity] = useState("");
  const [treatment, setTreatment] = useState("");
  const [date, setDate] = useState("");

  function handleSearch() {
    const citySlug = city ? slugify(city) : "";
    const treatmentSlug = treatment ? slugify(treatment) : "";

    if (citySlug && treatmentSlug) {
      router.push(`/${citySlug}/${treatmentSlug}`);
      return;
    }

    if (treatmentSlug) {
      router.push(`/tratamientos/${treatmentSlug}`);
      return;
    }

    if (citySlug) {
      router.push(`/clinics?city=${citySlug}`);
      return;
    }

    router.push("/clinics");
  }

  return (
    <div className="mt-12 w-full max-w-5xl overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-2xl shadow-black/[0.03]">
      <div className="grid grid-cols-1 md:grid-cols-4">
        <div className="border-b border-black/5 p-6 md:border-b-0 md:border-r">
          <p className="text-sm font-medium">Ciudad</p>

          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Madrid"
            className="mt-2 w-full bg-transparent text-neutral-600 outline-none"
          />
        </div>

        <div className="border-b border-black/5 p-6 md:border-b-0 md:border-r">
          <p className="text-sm font-medium">Tratamiento</p>

          <input
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="Botox"
            className="mt-2 w-full bg-transparent text-neutral-600 outline-none"
          />
        </div>

        <div className="border-b border-black/5 p-6 md:border-b-0 md:border-r">
          <p className="text-sm font-medium">Fecha</p>

          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="Esta semana"
            className="mt-2 w-full bg-transparent text-neutral-600 outline-none"
          />
        </div>

        <div className="flex items-center justify-center p-4">
          <button
            onClick={handleSearch}
            className="w-full rounded-2xl bg-black px-6 py-4 text-white transition hover:opacity-90"
          >
            Buscar clinicas
          </button>
        </div>
      </div>
    </div>
  );
}
