"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getTreatmentName,
  getTreatmentPriceValue,
} from "@/lib/treatment-utils";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  clinicName: string;
  specialistName?: string;
  specialists?: SpecialistOption[];
  treatments?: TreatmentOption[];
  initialTreatment?: string;
  initialDate?: string;
  initialTime?: string;
  bookingSource?: string;
}

type TreatmentOption =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
    };

type SpecialistOption =
  | string
  | {
      name?: string | null;
      treatments?: TreatmentOption[] | null;
    };

function getTodayDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getWeekOffsetForDate(value: string) {
  const today = new Date(getTodayDate());
  const target = new Date(`${value.slice(0, 10)}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  return Math.floor(diffDays / 7);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
  });
}

function getSpecialistName(specialist: SpecialistOption) {
  if (typeof specialist === "string") return specialist;
  return specialist?.name || "";
}

function getSpecialistTreatments(specialist: SpecialistOption) {
  if (typeof specialist === "string") return null;
  return specialist.treatments || null;
}

export function BookingModal({
  open,
  onClose,
  clinicName,
  specialistName,
  specialists = [],
  treatments,
  initialTreatment,
  initialDate,
  initialTime,
  bookingSource = "direct",
}: BookingModalProps) {
  const [success, setSuccess] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [treatmentDuration, setTreatmentDuration] = useState(60);

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [dayBlocked, setDayBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const [selectedSpecialist, setSelectedSpecialist] = useState(
    specialistName || ""
  );

  const today = getTodayDate();

  const baseTreatments = useMemo(
    () =>
      treatments && treatments.length > 0
        ? treatments.map((treatment) =>
            getTreatmentName(treatment)
          )
        : [
            "Botox",
            "Acido hialuronico",
            "Full Face",
            "Rinomodelacion",
          ],
    [treatments]
  );

  const canChooseSpecialist = !specialistName && specialists.length > 0;

  const selectedSpecialistTreatments = useMemo(() => {
    if (!selectedSpecialist) {
      return null;
    }

    const specialist = specialists.find(
      (item) => getSpecialistName(item) === selectedSpecialist
    );
    const specialistTreatments = specialist
      ? getSpecialistTreatments(specialist)
      : null;

    return specialistTreatments && specialistTreatments.length > 0
      ? specialistTreatments.map(getTreatmentName)
      : null;
  }, [selectedSpecialist, specialists]);

  const availableTreatments = selectedSpecialistTreatments || baseTreatments;

  const selectedTreatmentEntry = useMemo(() => {
    const fallbackTreatment = treatments?.find(
      (treatment) =>
        getTreatmentName(treatment).toLowerCase().trim() ===
        selectedTreatment.toLowerCase().trim()
    );

    if (!selectedSpecialist) {
      return fallbackTreatment;
    }

    const specialist = specialists.find(
      (item) => getSpecialistName(item) === selectedSpecialist
    );
    const specialistTreatments = specialist
      ? getSpecialistTreatments(specialist)
      : null;

    return specialistTreatments?.find(
      (treatment) =>
        getTreatmentName(treatment).toLowerCase().trim() ===
        selectedTreatment.toLowerCase().trim()
    ) || fallbackTreatment;
  }, [selectedSpecialist, selectedTreatment, specialists, treatments]);

  const selectedPrice = getTreatmentPriceValue(selectedTreatmentEntry);

  const weekDays = useMemo(() => {
    const base = addDays(new Date(), weekOffset * 7);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(base, index);

      return {
        label: formatDayLabel(date),
        value: formatDate(date),
      };
    });
  }, [weekOffset]);

  useEffect(() => {
    setSelectedSpecialist(specialistName || "");
  }, [specialistName]);

  useEffect(() => {
    if (!open) return;

    setFormError("");

    if (initialDate) {
      setSelectedDate(initialDate);
      setWeekOffset(getWeekOffsetForDate(initialDate));
    }

    if (initialTime) {
      setSelectedTime(initialTime);
    }
  }, [open, initialDate, initialTime]);

  useEffect(() => {
    if (
      initialTreatment &&
      availableTreatments.some(
        (treatment) =>
          treatment.toLowerCase().trim() ===
          initialTreatment.toLowerCase().trim()
      )
    ) {
      setSelectedTreatment(initialTreatment);
      return;
    }

    if (!selectedTreatment && availableTreatments.length > 0) {
      setSelectedTreatment(availableTreatments[0]);
    }
  }, [availableTreatments, initialTreatment, selectedTreatment]);

  useEffect(() => {
    if (
      selectedTreatment &&
      !availableTreatments.some(
        (treatment) =>
          treatment.toLowerCase().trim() === selectedTreatment.toLowerCase().trim()
      )
    ) {
      setSelectedTreatment(availableTreatments[0] || "");
      setSelectedTime("");
    }
  }, [availableTreatments, selectedTreatment]);

  useEffect(() => {
    if (!selectedTreatment) return;

    fetch(`/api/treatment-duration?treatment=${encodeURIComponent(selectedTreatment)}`)
      .then((res) => res.json())
      .then((data) => {
        setTreatmentDuration(data.duration || 60);
      });
  }, [selectedTreatment]);

  useEffect(() => {
    if (!selectedDate || !selectedSpecialist) {
      setBookedSlots([]);
      setAvailableSlots([]);
      setDayBlocked(false);
      setBlockedMessage("");
      setAvailabilityLoading(false);
      return;
    }

    setAvailabilityLoading(true);

    fetch(
      `/api/booked-slots?specialist=${encodeURIComponent(
        selectedSpecialist
      )}&date=${selectedDate}&duration=${treatmentDuration}&treatment=${encodeURIComponent(
        selectedTreatment
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setBookedSlots([]);
          setAvailableSlots([]);
          setDayBlocked(true);
          setBlockedMessage(data.error);
          setSelectedTime("");
          return;
        }

        const booked = data.bookedSlots || data.slots || [];
        const available = data.availableSlots || [];

        const blocked = Boolean(data.blocked);

        setBookedSlots(booked);
        setDayBlocked(blocked);

        if (blocked) {
          setAvailableSlots([]);
          setBlockedMessage(data.reason || "Dia no disponible");
          setSelectedTime("");
          return;
        }

        setBlockedMessage("");

        setAvailableSlots(available);

        if (
          selectedTime &&
          (booked.includes(selectedTime) || !available.includes(selectedTime))
        ) {
          setSelectedTime("");
        }
      })
      .catch(() => {
        setBookedSlots([]);
        setAvailableSlots([]);
        setDayBlocked(true);
        setBlockedMessage("No se pudo consultar la disponibilidad");
        setSelectedTime("");
      })
      .finally(() => {
        setAvailabilityLoading(false);
      });
  }, [
    selectedDate,
    selectedSpecialist,
    selectedTime,
    selectedTreatment,
    treatmentDuration,
  ]);

  if (!open) return null;

  function formatPrice(value?: number | null) {
    if (!value) {
      return "A consultar";
    }

    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatReadableDate(value?: string) {
    if (!value) {
      return "Sin seleccionar";
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const bookingReady =
    Boolean(selectedSpecialist) &&
    Boolean(selectedTreatment) &&
    Boolean(selectedDate) &&
    Boolean(selectedTime);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setFormError("");

    if (!selectedSpecialist) {
      setFormError("Selecciona un especialista.");
      return;
    }

    if (!selectedTreatment) {
      setFormError("Selecciona un tratamiento.");
      return;
    }

    if (!selectedDate || selectedDate < today) {
      setFormError("Selecciona una fecha valida.");
      return;
    }

    if (dayBlocked) {
      setFormError("Este especialista no esta disponible en esa fecha.");
      return;
    }

    if (!selectedTime) {
      setFormError("Selecciona una hora disponible.");
      return;
    }

    if (bookedSlots.includes(selectedTime)) {
      setFormError("Ese horario ya esta reservado.");
      return;
    }

    const formData = new FormData(e.currentTarget);

    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const website = formData.get("website") as string;

    if (!full_name?.trim()) {
      setFormError("Indica tu nombre para continuar.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
      setFormError("Indica un email valido para confirmar la reserva.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/create-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clinic_name: clinicName,
        specialist_name: selectedSpecialist,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim(),
        website,
        booking_date: selectedDate,
        booking_time: selectedTime,
        treatment: selectedTreatment,
        duration_minutes: treatmentDuration,
        booking_source: bookingSource,
        source_url:
          typeof window !== "undefined" ? window.location.href : undefined,
        booking_context: {
          price_from: selectedPrice,
          duration_minutes: treatmentDuration,
          availability_checked: Boolean(selectedDate && selectedTime),
        },
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setFormError(data?.error || "Error al guardar reserva.");
      return;
    }

    setBookingStatus(data.status || "Pendiente");
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      setBookingStatus("");
      setSelectedDate("");
      setSelectedTime("");
      setBookedSlots([]);
      setAvailableSlots([]);
      setDayBlocked(false);
      setBlockedMessage("");
      setSelectedSpecialist(specialistName || "");
      setSelectedTreatment(initialTreatment || availableTreatments[0] || "");
      setSelectedDate(initialDate || "");
      setSelectedTime(initialTime || "");
      onClose();
    }, 3500);
  };

  const modal = (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[999999] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm lg:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.35 }}
          className="relative my-4 grid w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.18)] sm:rounded-[40px] lg:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="relative flex flex-col justify-between overflow-hidden bg-[#050505] p-6 text-white sm:p-10 lg:p-12">
            <div className="relative z-10">
              <div className="mb-4 text-xs uppercase tracking-[0.35em] text-white/40">
                Reserva EncuentraTuClinica
              </div>

              <h2 className="text-4xl font-semibold leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
                {clinicName}
              </h2>

              {selectedSpecialist && (
                <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 backdrop-blur-xl">
                  Con {selectedSpecialist}
                </div>
              )}

              <p className="mt-8 max-w-md text-lg leading-relaxed text-white/55">
                Revisa tratamiento, especialista y huecos reales antes de
                enviar tu solicitud de reserva.
              </p>
            </div>

            <div className="relative z-10 mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5">
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                  Fecha
                </div>

                <div className="mt-4 text-xl font-medium capitalize">
                  {formatReadableDate(selectedDate)}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5">
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                  Hora
                </div>

                <div className="mt-4 text-xl font-medium">
                  {selectedTime || "Sin seleccionar"}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:col-span-2 sm:p-5">
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                  Tratamiento
                </div>

                <div className="mt-4 text-xl font-medium">
                  {selectedTreatment || "Sin seleccionar"} - {treatmentDuration} min
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Desde {formatPrice(selectedPrice)}
                </div>
              </div>

              {selectedSpecialist && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl col-span-2">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                    Especialista
                  </div>

                  <div className="mt-4 text-xl font-medium">
                    {selectedSpecialist}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative bg-[#FAF8F5] p-8 pt-20 lg:p-12 lg:pt-20">
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="absolute right-6 top-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-xl text-black shadow-sm transition-all duration-300 hover:scale-105 hover:bg-black hover:text-white"
            >
              x
            </button>

            {success ? (
              <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-black text-3xl text-white">
                  OK
                </div>

                <h2 className="text-4xl font-semibold">Reserva enviada</h2>

                <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">
                  Te enviamos un email para confirmar la solicitud. El hueco queda
                  protegido durante el plazo de confirmacion y el equipo recibira
                  todos los detalles.
                </p>

                <div className="mt-8 grid w-full max-w-xl gap-3 rounded-[28px] border border-black/10 bg-white p-5 text-left text-sm">
                  <div>
                    <span className="font-medium">Tratamiento:</span>{" "}
                    {selectedTreatment}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span>{" "}
                    {formatReadableDate(selectedDate)} - {selectedTime}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>{" "}
                    {bookingStatus || "Pendiente"}
                  </div>
                </div>

                <div className="mt-5 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Importante: abre el email y pulsa confirmar para dejar la cita
                  definitivamente reservada.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="grid gap-6">
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="booking-website">Website</label>
                  <input
                    id="booking-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                    Paso 1
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Tus datos
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Usaremos estos datos solo para confirmar y gestionar la cita.
                  </p>
                </div>

                {canChooseSpecialist && (
                  <select
                    value={selectedSpecialist}
                    onChange={(e) => {
                      setSelectedSpecialist(e.target.value);
                      setSelectedDate("");
                      setSelectedTime("");
                      setBookedSlots([]);
                      setAvailableSlots([]);
                      setDayBlocked(false);
                      setBlockedMessage("");
                    }}
                    required
                    className="h-16 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none transition focus:border-black"
                  >
                    <option value="">Selecciona especialista</option>

                    {specialists.map((specialist) => {
                      const name = getSpecialistName(specialist);

                      return (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="full_name"
                    type="text"
                    placeholder="Nombre completo"
                    required
                    className="h-16 rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none transition focus:border-black"
                  />

                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="h-16 rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none transition focus:border-black"
                  />
                </div>

                <input
                  name="phone"
                  type="tel"
                  placeholder="Telefono o WhatsApp opcional"
                  className="h-16 rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none transition focus:border-black"
                />

                <select
                  value={selectedTreatment}
                  onChange={(e) => {
                    setSelectedTreatment(e.target.value);
                    setSelectedTime("");
                  }}
                  required
                  className="h-16 rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none transition focus:border-black"
                >
                  {availableTreatments.map((treatment) => (
                    <option key={treatment} value={treatment}>
                      {treatment}
                    </option>
                  ))}
                </select>

                <div className="pt-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                    Paso 2
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Elige dia y hora
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Los horarios se comprueban contra la disponibilidad real del
                    especialista.
                  </p>
                </div>

                <div className="rounded-[28px] border border-black/10 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={weekOffset === 0}
                      onClick={() => setWeekOffset((value) => value - 1)}
                      className="w-full rounded-full border border-black/10 px-5 py-3 text-sm transition hover:bg-black hover:text-white disabled:opacity-30 sm:w-auto"
                    >
                      Semana anterior
                    </button>

                    <div className="text-center text-sm uppercase tracking-[0.25em] text-neutral-500">
                      Vista semanal
                    </div>

                    <button
                      type="button"
                      onClick={() => setWeekOffset((value) => value + 1)}
                      className="w-full rounded-full border border-black/10 px-5 py-3 text-sm transition hover:bg-black hover:text-white sm:w-auto"
                    >
                      Semana siguiente
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {weekDays.map((day) => {
                      const active = selectedDate === day.value;
                      const past = day.value < today;

                      return (
                        <button
                          key={day.value}
                          type="button"
                          disabled={past}
                          onClick={() => {
                            setSelectedDate(day.value);
                            setSelectedTime("");
                          }}
                          className={`rounded-2xl px-2 py-4 text-center transition ${
                            active
                              ? "bg-black text-white"
                              : past
                              ? "cursor-not-allowed bg-neutral-100 text-neutral-300"
                              : "bg-[#F7F5F2] text-black hover:bg-black hover:text-white"
                          }`}
                        >
                          <div className="text-xs uppercase">{day.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[28px] border border-black/10 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        Huecos disponibles
                      </div>

                      <div className="mt-1 text-sm text-neutral-400">
                        {selectedDate
                          ? `${formatReadableDate(selectedDate)} - Duracion ${treatmentDuration} min`
                          : "Selecciona un dia para ver horarios"}
                      </div>
                    </div>
                  </div>

                  {blockedMessage && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                      {blockedMessage}
                    </div>
                  )}

                  {availabilityLoading && (
                    <div className="mb-5 rounded-2xl border border-black/10 bg-[#F7F5F2] p-4 text-sm text-neutral-600">
                      Consultando disponibilidad real del especialista...
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {availableSlots.map((hour) => {
                      const reserved = bookedSlots.includes(hour);
                      const active = selectedTime === hour;
                      const disabled =
                        reserved ||
                        !selectedSpecialist ||
                        !selectedDate ||
                        dayBlocked;

                      return (
                        <button
                          type="button"
                          key={hour}
                          disabled={disabled}
                          onClick={() => setSelectedTime(hour)}
                          className={`h-16 rounded-2xl border text-sm font-medium transition-all duration-300 ${
                            reserved
                              ? "cursor-not-allowed border-red-200 bg-red-50 text-red-500"
                              : active
                              ? "scale-[1.02] border-black bg-black text-white"
                              : disabled
                              ? "cursor-not-allowed border-black/5 bg-neutral-100 text-neutral-400"
                              : "border-black/10 bg-white hover:border-black hover:bg-black hover:text-white"
                          }`}
                        >
                          {reserved ? "Ocupado" : hour}
                        </button>
                      );
                    })}
                  </div>

                  {!dayBlocked &&
                    selectedDate &&
                    selectedSpecialist &&
                    !availabilityLoading &&
                    availableSlots.length === 0 && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                        <p className="font-medium">
                          No hay horarios disponibles para esta fecha.
                        </p>
                        <p className="mt-1">
                          Prueba otro dia de la semana o avanza a la semana
                          siguiente para ver mas huecos.
                        </p>
                        <button
                          type="button"
                          onClick={() => setWeekOffset((value) => value + 1)}
                          className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
                        >
                          Ver semana siguiente
                        </button>
                      </div>
                    )}
                </div>

                <div className="pt-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                    Paso 3
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Revisa y envia
                  </h2>
                </div>

                <div className="rounded-[28px] border border-black/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        Resumen
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {bookingReady
                          ? "Todo listo para solicitar la reserva"
                          : "Completa los pasos para continuar"}
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-4 py-2 text-xs ${
                        bookingReady
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {bookingReady
                        ? "Listo"
                        : "Pendiente"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
                    <div>
                      <span className="font-medium text-black">Lugar:</span>{" "}
                      {clinicName}
                    </div>
                    <div>
                      <span className="font-medium text-black">Especialista:</span>{" "}
                      {selectedSpecialist || "Sin seleccionar"}
                    </div>
                    <div>
                      <span className="font-medium text-black">Tratamiento:</span>{" "}
                      {selectedTreatment || "Sin seleccionar"} - {treatmentDuration} min
                    </div>
                    <div>
                      <span className="font-medium text-black">Fecha y hora:</span>{" "}
                      {selectedDate && selectedTime
                        ? `${formatReadableDate(selectedDate)} - ${selectedTime}`
                        : "Sin seleccionar"}
                    </div>
                    <div>
                      <span className="font-medium text-black">Precio:</span>{" "}
                      Desde {formatPrice(selectedPrice)}
                    </div>
                    <div>
                      <span className="font-medium text-black">Disponibilidad:</span>{" "}
                      {availabilityLoading
                        ? "Comprobando"
                        : selectedTime
                          ? "Hueco validado"
                          : "Pendiente"}
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    availabilityLoading ||
                    dayBlocked ||
                    !bookingReady
                  }
                  className="mt-3 h-16 rounded-2xl bg-black text-lg font-medium text-white transition-all duration-300 hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar solicitud de reserva"}
                </button>

                <p className="text-center text-xs leading-5 text-neutral-500">
                  La cita se confirma definitivamente desde el email que recibiras.
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof window === "undefined") return null;

  return createPortal(modal, document.body);
}
