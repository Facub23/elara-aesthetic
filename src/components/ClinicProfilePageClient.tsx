"use client";

import Image from "next/image";
import FavoriteClinicButton from "@/components/FavoriteClinicButton";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import {
  getTreatmentName as readTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";
import { BookingModal } from "@/components/modals/booking-modal";

function normalizeText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getTreatmentName(treatment: string | { name?: string | null }) {
  return readTreatmentName(treatment);
}

function specialistOffersTreatment(specialist: any, treatmentName: string) {
  if (!Array.isArray(specialist.treatments)) {
    return false;
  }

  return specialist.treatments.some(
    (treatment: string | { name?: string | null }) =>
      normalizeText(getTreatmentName(treatment)) === normalizeText(treatmentName)
  );
}

function formatPrice(value?: string | number | null) {
  if (!value) return null;

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.,]/g, "").replace(",", "."));

  if (!Number.isFinite(parsed)) return null;

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function getTreatmentPrice(treatment: string | { price?: string | number | null }) {
  return formatPrice(getTreatmentPriceValue(treatment));
}

export default function ClinicProfilePageClient({
  clinic,
  specialists,
  reviews,
}: {
  clinic: any;
  specialists: any[];
  reviews: any[];
}) {
  const [bookingOpen, setBookingOpen] = useState(false);

  const clinicTreatments = useMemo(() => {
    const treatmentSet = new Set<string>();

    specialists.forEach((specialist) => {
      if (Array.isArray(specialist.treatments)) {
        specialist.treatments.forEach((treatment: string | { name?: string }) => {
          const name = getTreatmentName(treatment);

          if (name) treatmentSet.add(name);
        });
      }
    });

    return Array.from(treatmentSet);
  }, [specialists]);

  const treatmentContexts = useMemo(
    () =>
      clinicTreatments.map((treatment) => ({
        name: treatment,
        specialists: specialists.filter((specialist) =>
          specialistOffersTreatment(specialist, treatment)
        ),
      })),
    [clinicTreatments, specialists]
  );

  const lowestTreatmentPrice = useMemo(() => {
    const prices = specialists
      .flatMap((specialist) =>
        Array.isArray(specialist.treatments) ? specialist.treatments : []
      )
      .map(getTreatmentPriceValue)
      .filter((price): price is number => Boolean(price));

    return prices.length > 0 ? formatPrice(Math.min(...prices)) : null;
  }, [specialists]);

  const approvedReviewRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : null;
  const displayedRating = approvedReviewRating || clinic.rating || "5.0";
  const clinicLocation =
    clinic.location || `${clinic.city || ""}, ${clinic.country || ""}`;

  const clinicImage = clinic.heroImage || clinic.image || "/og-image.jpg";
  const clinicStats = [
    ["Tratamientos", clinicTreatments.length],
    ["Especialistas", specialists.length],
    ["Reviews", reviews.length],
    ["Desde", lowestTreatmentPrice || "Consultar"],
  ];
  const decisionSteps = [
    {
      title: "Tratamientos conectados",
      text: "Cada tratamiento apunta a especialistas reales de esta clinica.",
    },
    {
      title: "Reserva con contexto",
      text: "Puedes elegir profesional, tratamiento y horario sin salir del flujo.",
    },
    {
      title: "Confianza verificable",
      text: "Reviews, rating y datos de clinica quedan juntos antes de reservar.",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6F3EE] text-black">
      <Navbar />

      <motion.section
        initial={false}
        className="relative overflow-hidden pt-32"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-20 px-6 lg:grid-cols-2">
          <div className="relative z-10">
            <div className="flex flex-wrap gap-3">
              <div className="max-w-full rounded-full border border-black/5 bg-white/70 px-5 py-2 text-sm backdrop-blur-xl">
                Clinica verificada
              </div>

              <div className="max-w-full rounded-full bg-black px-5 py-2 text-sm text-white">
                Rating {displayedRating}
              </div>

              <div className="max-w-full rounded-full border border-black/5 bg-white/70 px-5 py-2 text-sm backdrop-blur-xl">
                {clinicLocation}
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl md:text-8xl">
              {clinic.name}
            </h1>

            <p className="mt-10 max-w-2xl line-clamp-3 text-xl leading-relaxed text-neutral-600 md:text-2xl">
              {clinic.description}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {clinicStats.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-black/10 bg-white/75 p-4 backdrop-blur-xl"
                >
                  <div className="text-2xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 flex flex-wrap gap-5">
              <button
                onClick={() => setBookingOpen(true)}
                className="w-full rounded-full bg-black px-8 py-5 text-white transition-all duration-300 hover:scale-[1.03] sm:w-auto sm:px-10"
              >
                Reservar consulta
              </button>

              <Link
                href={`/tratamientos?clinic=${clinic.slug}`}
                className="w-full rounded-full border border-black/5 bg-white/70 px-8 py-5 text-center backdrop-blur-xl transition-all duration-300 hover:bg-black hover:text-white sm:w-auto sm:px-10"
              >
                Comparar tratamientos
              </Link>

              <a
                href={`https://wa.me/${clinic.whatsapp || "34600000000"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-full border border-black/5 bg-white/70 px-8 py-5 text-center backdrop-blur-xl transition-all duration-300 hover:bg-black hover:text-white sm:w-auto sm:px-10"
              >
                WhatsApp
              </a>

              <FavoriteClinicButton
                clinicId={String(clinic.id)}
                clinicName={clinic.name}
                clinicSlug={clinic.slug}
                clinicLocation={clinicLocation}
              />
            </div>

            {clinicTreatments.length > 0 && (
              <div className="mt-12">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Tratamientos disponibles
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {clinicTreatments.map((treatment) => (
                    <Link
                      key={treatment}
                      href={`/especialistas?clinic=${encodeURIComponent(
                        clinic.slug
                      )}&treatment=${encodeURIComponent(treatment)}`}
                      className="rounded-full bg-white/70 px-5 py-3 text-sm shadow-sm backdrop-blur-xl transition-all duration-300 hover:bg-black hover:text-white"
                    >
                      {treatment}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 1,
            }}
            className="relative overflow-hidden rounded-[48px]"
          >
            <div className="relative h-[760px] w-full">
              <Image
                src={clinicImage}
                alt={clinic.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </motion.div>
        </div>
      </motion.section>

      <section className="mt-16 px-6">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {decisionSteps.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-black/10 bg-white/75 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            >
              <div className="text-sm font-semibold">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {treatmentContexts.length > 0 && (
        <section className="relative mt-28 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  Tratamientos de esta clinica
                </p>

                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
                  Que puedes reservar en {clinic.name}
                </h2>

                <p className="mt-6 text-xl leading-relaxed text-neutral-600">
                  Cada tratamiento queda conectado con los especialistas reales de esta
                  clinica para que puedas comparar y reservar sin perder contexto.
                </p>
              </div>

              <Link
                href={`/tratamientos?clinic=${clinic.slug}`}
                className="inline-flex rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium backdrop-blur-xl transition hover:border-black"
              >
                Ver todos los tratamientos
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {treatmentContexts.map(({ name, specialists: treatmentSpecialists }) => {
                const firstSpecialist = treatmentSpecialists[0];
                const treatmentSlug = slugify(name);
                const prices = treatmentSpecialists
                  .flatMap((specialist) =>
                    Array.isArray(specialist.treatments)
                      ? specialist.treatments
                      : []
                  )
                  .filter(
                    (treatment: string | { name?: string | null }) =>
                      normalizeText(getTreatmentName(treatment)) ===
                      normalizeText(name)
                  )
                  .map(getTreatmentPrice)
                  .filter(Boolean);
                const priceLabel = prices[0];

                return (
                  <article
                    key={name}
                    className="flex min-h-[330px] flex-col rounded-lg border border-black/10 bg-white/75 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                  >
                    <div className="w-fit rounded-full bg-[#F6F3EE] px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-600">
                      Tratamiento
                    </div>

                    <h3 className="mt-5 text-3xl font-semibold tracking-tight">
                      {name}
                    </h3>

                    <div className="mt-5 rounded-md bg-[#F8F6F2] p-4 text-sm">
                      <span className="font-semibold">
                        {treatmentSpecialists.length}
                      </span>{" "}
                      especialista{treatmentSpecialists.length === 1 ? "" : "s"} en esta
                      clinica
                      {priceLabel ? (
                        <span className="mt-2 block text-neutral-500">
                          Desde <span className="font-semibold text-black">{priceLabel}</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {treatmentSpecialists.slice(0, 3).map((specialist) => (
                        <Link
                          key={String(specialist.id || specialist.slug || specialist.name)}
                          href={`/especialistas/${specialist.slug}?treatment=${encodeURIComponent(
                            name
                          )}`}
                          className="rounded-full bg-[#F8F6F2] px-3 py-1 text-xs text-neutral-600 transition hover:bg-black hover:text-white"
                        >
                          {specialist.name}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-3 pt-8">
                      <Link
                        href={`/tratamientos/${treatmentSlug}`}
                        className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Comparar tratamiento
                      </Link>

                      <Link
                        href={`/especialistas?clinic=${encodeURIComponent(
                          clinic.slug
                        )}&treatment=${encodeURIComponent(name)}`}
                        className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                      >
                        Elegir especialista
                      </Link>

                      {firstSpecialist?.slug && (
                        <Link
                          href={`/especialistas/${firstSpecialist.slug}?treatment=${encodeURIComponent(
                            name
                          )}`}
                          className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                        >
                          Reservar primera cita
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {specialists.length > 0 && (
        <section className="relative mt-28 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  Especialistas de la clinica
                </p>

                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
                  Elige profesional dentro de {clinic.name}
                </h2>

                <p className="mt-6 text-xl leading-relaxed text-neutral-600">
                  Compara especialidad, tratamientos y perfil antes de reservar.
                </p>
              </div>

              <Link
                href={`/especialistas?clinic=${encodeURIComponent(clinic.slug)}`}
                className="inline-flex rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium backdrop-blur-xl transition hover:border-black"
              >
                Ver todos los especialistas
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {specialists.map((specialist) => {
                const specialistTreatments: string[] = Array.isArray(specialist.treatments)
                  ? specialist.treatments.map(getTreatmentName).filter(Boolean)
                  : [];
                const primaryTreatment = specialistTreatments[0];

                return (
                  <article
                    key={String(specialist.id || specialist.slug || specialist.name)}
                    className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-black/10 bg-white/75 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                  >
                    <div className="relative h-60 bg-[#E7DED1]">
                      <Image
                        src={specialist.image || "/og-image.jpg"}
                        alt={specialist.name || "Especialista EncuentraTuClinica"}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {specialist.specialty || "Medicina estetica"}
                      </div>

                      <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                        {specialist.name}
                      </h3>

                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
                        {specialist.bio ||
                          `${specialist.name || "Especialista"} atiende tratamientos premium en ${clinic.name}.`}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {specialistTreatments.slice(0, 4).map((treatment) => (
                          <Link
                            key={treatment}
                            href={`/tratamientos/${slugify(treatment)}`}
                            className="rounded-full bg-[#F8F6F2] px-3 py-1 text-xs text-neutral-600 transition hover:bg-black hover:text-white"
                          >
                            {treatment}
                          </Link>
                        ))}
                      </div>

                      <div className="mt-auto flex flex-wrap gap-3 pt-7">
                        {specialist.slug && (
                          <Link
                            href={`/especialistas/${specialist.slug}${
                              primaryTreatment
                                ? `?treatment=${encodeURIComponent(primaryTreatment)}`
                                : ""
                            }`}
                            className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            Reservar consulta
                          </Link>
                        )}

                        {specialist.slug && (
                          <Link
                            href={`/especialistas/${specialist.slug}`}
                            className="rounded-md border border-black/10 px-5 py-3 text-sm font-medium transition hover:border-black"
                          >
                            Ver perfil
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="relative mt-32 px-6 pb-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Opiniones verificadas
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
              Pacientes reales. Experiencias reales.
            </h2>

            <p className="mt-8 text-xl leading-relaxed text-neutral-600">
              Opiniones verificadas de pacientes que reservaron citas en esta
              clinica.
            </p>

            {reviews.length > 0 && (
              <p className="mt-5 text-lg text-neutral-600">
                {displayedRating}/5 basado en {reviews.length} opiniones con
                reserva completada.
              </p>
            )}
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {reviews.length === 0 ? (
              <div className="rounded-[40px] bg-white/70 p-10 text-neutral-500 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
                Esta clinica todavia no tiene reviews verificadas.
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-full bg-black px-4 py-2 text-sm text-white">
                      Verificada
                    </div>

                    {review.featured && (
                      <div className="rounded-full bg-[#F2EEE8] px-4 py-2 text-sm">
                        Destacada
                      </div>
                    )}
                  </div>

                  <div className="mt-8 text-3xl font-semibold">
                    {review.rating || 5}/5
                  </div>

                  <p className="mt-6 text-lg leading-relaxed text-neutral-700">
                    &ldquo;{review.review}&rdquo;
                  </p>

                  <div className="mt-8 border-t border-black/5 pt-6">
                    <div className="text-xl font-semibold">
                      {review.patient_name}
                    </div>

                    <div className="mt-2 text-sm text-neutral-500">
                      {review.treatment}
                    </div>

                    {review.specialist_name && (
                      <div className="mt-4 inline-flex rounded-full bg-[#F7F5F2] px-4 py-2 text-sm">
                        {review.specialist_name}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {bookingOpen && (
        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          clinicName={clinic.name}
          specialists={specialists.map((specialist) => ({
            name: specialist.name,
            treatments: specialist.treatments || [],
          }))}
          treatments={clinicTreatments}
          bookingSource="clinic_profile"
        />
      )}
    </main>
  );
}
