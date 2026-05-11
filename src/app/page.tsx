"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { clinics } from "@/data/clinics";

export default function ClinicsPage() {

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("Todas");

  const filteredClinics = useMemo(() => {

    return clinics.filter((clinic) => {

      const matchesSearch =
        clinic.name.toLowerCase().includes(search.toLowerCase());

      const matchesCity =
        city === "Todas" ||
        clinic.name.toLowerCase().includes(city.toLowerCase());

      return matchesSearch && matchesCity;

    });

  }, [search, city]);

  return (

    <main className="min-h-screen bg-white text-black">

      <Navbar />

      {/* HERO */}

      <section className="relative overflow-hidden pb-24 pt-36">

        <div className="mx-auto max-w-7xl px-6">

          <div className="max-w-4xl">

            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Luxury Clinics
            </p>

            <h1 className="mt-6 text-6xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              Descubre clínicas estéticas premium.
            </h1>

            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-neutral-600">
              Explora especialistas cuidadosamente seleccionados.
            </p>

          </div>

          {/* SEARCH */}

          <div className="mt-14 max-w-2xl">

            <div className="flex items-center rounded-full border border-black/5 bg-white px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">

              <input
                type="text"
                placeholder="Buscar clínica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-lg outline-none placeholder:text-neutral-400"
              />

            </div>

            {/* FILTERS */}

            <div className="mt-6 flex flex-wrap gap-3">

              {["Todas", "Madrid", "Barcelona"].map((item) => (

                <button
                  key={item}
                  onClick={() => setCity(item)}
                  className={`rounded-full px-5 py-2 text-sm transition-all duration-300 ${
                    city === item
                      ? "bg-black text-white"
                      : "border border-black/5 bg-white text-black hover:bg-black hover:text-white"
                  }`}
                >
                  {item}
                </button>

              ))}

            </div>

          </div>

        </div>

      </section>

      {/* CLINICS */}

      <section className="mx-auto max-w-7xl px-6 pb-28">

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">

          {filteredClinics.map((clinic) => (

            <div
              key={clinic.slug}
              className="group overflow-hidden rounded-[36px] border border-black/5 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)]"
            >

              {/* IMAGE */}

              <div className="relative overflow-hidden">

                <img
                  src={clinic.image}
                  alt={clinic.name}
                  className="h-[420px] w-full object-cover transition duration-1000 group-hover:scale-110"
                />

                <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black backdrop-blur">
                  ⭐ {clinic.rating}
                </div>

              </div>

              {/* CONTENT */}

              <div className="p-8 transition duration-500 group-hover:bg-[#f5f5f5]">

                <h2 className="text-3xl font-semibold tracking-tight">
                  {clinic.name}
                </h2>

                <p className="mt-4 leading-relaxed text-neutral-600">
                  {clinic.description}
                </p>

                {/* STATS */}

                <div className="mt-8 flex flex-wrap gap-4">

                  <div className="rounded-2xl bg-[#f3f3f3] px-4 py-3">

                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Pacientes
                    </div>

                    <div className="mt-1 font-semibold">
                      {clinic.patients}
                    </div>

                  </div>

                  <div className="rounded-2xl bg-[#f3f3f3] px-4 py-3">

                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Experiencia
                    </div>

                    <div className="mt-1 font-semibold">
                      {clinic.experience}
                    </div>

                  </div>

                </div>

                {/* BUTTON */}

                <div className="mt-10 flex flex-wrap gap-4">

                  <Link
                    href={`/clinics/${clinic.slug}`}
                    className="rounded-full bg-black px-8 py-4 text-white transition-all duration-300 hover:opacity-90"
                  >
                    Explorar clínica
                  </Link>

                </div>

              </div>

            </div>

          ))}

        </div>

      </section>

    </main>
  );
}