"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/client";
import {
  getBookingStatusClass,
  getBookingStatusKey,
  isPendingBookingStatus,
} from "@/lib/booking-status";

import BookingTimeline from "@/components/BookingTimeline";
import { showAdminToast } from "@/components/AdminToast";

type Booking = {
  id: string;
  full_name: string;
  email?: string;
  clinic_name: string;
  specialist_name?: string;
  treatment: string;
  booking_date: string;
  booking_time?: string;
  duration_minutes?: number | string | null;
  booking_source?: string;
  source_url?: string;
  booking_context?: {
    price_from?: string | number | null;
    duration_minutes?: string | number | null;
    availability_checked?: boolean | null;
  } | null;
  status: string;
  created_at?: string;
  rescheduled_at?: string | null;
  rescheduled_by?: "patient" | "admin" | null;
  previous_booking_date?: string | null;
  previous_booking_time?: string | null;
};

const blockingStatuses = [
  "Pendiente",
  "Pendiente confirmacion",
  "Confirmada",
  "Reprogramada",
];

const hours = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

type SlotAvailability = {
  availableSlots: string[];
  blocked: boolean;
  reason?: string;
  error?: string;
};

function normalizeDate(value?: string) {
  if (!value) return "";

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  if (value.includes(" ")) {
    return value.split(" ")[0];
  }

  return value;
}

function normalizeTime(date?: string, time?: string) {
  if (time) return time;

  if (!date) return "";

  if (date.includes("T")) {
    return date.split("T")[1]?.slice(0, 5) || "";
  }

  if (date.includes(" ")) {
    return date.split(" ")[1]?.slice(0, 5) || "";
  }

  return "";
}

function getStatusClass(status: string) {
  return getBookingStatusClass(status, true);
}

function getPriorityLabel(status: string, bookingDate: string) {
  const date = normalizeDate(bookingDate);
  const today = new Date().toISOString().slice(0, 10);

  if (isPendingBookingStatus(status)) {
    return {
      label: "Requiere accion",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (
    date === today &&
    getBookingStatusKey(status) !== "completed" &&
    getBookingStatusKey(status) !== "cancelled"
  ) {
    return {
      label: "Hoy",
      className: "bg-black text-white",
    };
  }

  if (getBookingStatusKey(status) === "rescheduled") {
    return {
      label: "Cambio reciente",
      className: "bg-blue-100 text-blue-700",
    };
  }

  return null;
}

function getSourceLabel(source?: string) {
  const labels: Record<string, string> = {
    clinic_profile: "Ficha clinica",
    specialist_profile: "Ficha especialista",
    clinic_booking_page: "Pagina reserva",
    featured_clinic: "Clinica destacada",
    direct: "Directo",
  };

  return source ? labels[source] || source.replaceAll("_", " ") : "Sin origen";
}

function formatPrice(value?: string | number | null) {
  if (!value) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.,]/g, "").replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

export default function AdminLiveBookings({
  initialBookings,
}: {
  initialBookings: Booking[];
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [reprogrammingBooking, setReprogrammingBooking] =
    useState<Booking | null>(null);

  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availabilityReason, setAvailabilityReason] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  async function updateBookingStatus(bookingId: string, status: string) {
    if (status === "Completada") {
      showAdminToast(
        "El estado Completada se actualiza automaticamente.",
        "error"
      );
      return;
    }

    setUpdatingId(bookingId);

    const res = await fetch("/api/update-booking-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bookingId,
        status,
      }),
    });

    setUpdatingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showAdminToast(data.error || "Error actualizando estado", "error");
      return;
    }

    setBookings((prev) =>
      prev.map((booking) =>
        String(booking.id) === String(bookingId)
          ? {
              ...booking,
              status,
            }
          : booking
      )
    );

    showAdminToast("Estado actualizado", "success");
  }

  async function checkScheduleConflict() {
    if (!reprogrammingBooking?.specialist_name) {
      return false;
    }

    const { data, error } = await supabaseBrowser
      .from("bookings")
      .select("id, booking_date, booking_time, status")
      .eq("specialist_name", reprogrammingBooking.specialist_name)
      .neq("id", reprogrammingBooking.id);

    if (error) {
      console.error(error);
      showAdminToast("Error verificando disponibilidad", "error");
      return true;
    }

    const hasConflict = data?.some((booking) => {
      const bookingDate = normalizeDate(booking.booking_date);
      const bookingTime = normalizeTime(
        booking.booking_date,
        booking.booking_time
      );

      return (
        bookingDate === newDate &&
        bookingTime === newTime &&
        blockingStatuses.includes(booking.status)
      );
    });

    return Boolean(hasConflict);
  }

  async function reprogramBooking() {
    if (!reprogrammingBooking) return;

    if (!newDate || !newTime) {
      showAdminToast("Selecciona fecha y hora", "error");
      return;
    }

    if (!availableSlots.includes(newTime)) {
      showAdminToast(
        availabilityReason ||
          "Selecciona un hueco disponible para este especialista",
        "error"
      );
      return;
    }

    setUpdatingId(reprogrammingBooking.id);

    const hasConflict = await checkScheduleConflict();

    if (hasConflict) {
      setUpdatingId(null);
      showAdminToast(
        "Ese horario ya esta ocupado para este especialista",
        "error"
      );
      return;
    }

    const formattedDate = `${newDate} ${newTime}`;
    const previousDate = normalizeDate(reprogrammingBooking.booking_date);
    const previousTime = normalizeTime(
      reprogrammingBooking.booking_date,
      reprogrammingBooking.booking_time
    );

    const res = await fetch("/api/update-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        booking_id: reprogrammingBooking.id,
        booking_date: formattedDate,
        booking_time: newTime,
        status: "Reprogramada",
      }),
    });

    setUpdatingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showAdminToast(data.error || "Error reprogramando reserva", "error");
      return;
    }

    setBookings((prev) =>
      prev.map((booking) =>
        String(booking.id) === String(reprogrammingBooking.id)
          ? {
              ...booking,
              booking_date: formattedDate,
              booking_time: newTime,
              status: "Reprogramada",
              rescheduled_at: new Date().toISOString(),
              rescheduled_by: "admin",
              previous_booking_date: previousDate,
              previous_booking_time: previousTime,
            }
          : booking
      )
    );

    setReprogrammingBooking(null);
    setNewDate("");
    setNewTime("");
    setAvailableSlots([]);
    setAvailabilityReason("");
    showAdminToast("Reserva reprogramada", "success");
  }

  useEffect(() => {
    if (!reprogrammingBooking || !newDate) {
      setAvailableSlots([]);
      setAvailabilityReason("");
      return;
    }

    if (!reprogrammingBooking.specialist_name) {
      setAvailableSlots([]);
      setAvailabilityReason("La reserva no tiene especialista asignado");
      return;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityReason("");

      const params = new URLSearchParams({
        specialist: reprogrammingBooking?.specialist_name || "",
        date: newDate,
        duration: String(Number(reprogrammingBooking?.duration_minutes) || 60),
        bookingId: String(reprogrammingBooking?.id || ""),
      });

      try {
        const res = await fetch(`/api/booked-slots?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as SlotAvailability;

        if (!res.ok || data.error) {
          setAvailableSlots([]);
          setAvailabilityReason(
            data.error || "No se pudo cargar la disponibilidad"
          );
          return;
        }

        const slots = data.availableSlots || [];

        setAvailableSlots(slots);
        setAvailabilityReason(data.reason || "");

        if (newTime && !slots.includes(newTime)) {
          setNewTime("");
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAvailableSlots([]);
        setAvailabilityReason("No se pudo cargar la disponibilidad");
      } finally {
        setAvailabilityLoading(false);
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [newDate, newTime, reprogrammingBooking]);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("admin-live-bookings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const newBooking = payload.new as Booking;

          setBookings((prev) => {
            const exists = prev.some(
              (booking) => String(booking.id) === String(newBooking.id)
            );

            if (exists) return prev;

            return [
              {
                ...newBooking,
                id: String(newBooking.id),
              },
              ...prev,
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const updatedBooking = payload.new as Booking;

          setBookings((prev) =>
            prev.map((booking) =>
              String(booking.id) === String(updatedBooking.id)
                ? {
                    ...booking,
                    ...updatedBooking,
                    id: String(updatedBooking.id),
                  }
                : booking
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const deletedBooking = payload.old as Booking;

          setBookings((prev) =>
            prev.filter(
              (booking) => String(booking.id) !== String(deletedBooking.id)
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <div className="space-y-5">
        {bookings.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-10 text-center">
            No hay reservas todavía.
          </div>
        ) : (
          bookings.map((booking) => {
            const currentStatus = booking.status || "Pendiente";
            const isCompleted = getBookingStatusKey(currentStatus) === "completed";
            const isUpdating = updatingId === booking.id;
            const priority = getPriorityLabel(
              currentStatus,
              booking.booking_date
            );
            const bookingContext = booking.booking_context || {};
            const priceFrom = formatPrice(bookingContext.price_from);
            const sourceLabel = getSourceLabel(booking.booking_source);
            const wasRescheduled = Boolean(booking.rescheduled_at);
            const previousSchedule = [
              normalizeDate(booking.previous_booking_date || ""),
              booking.previous_booking_time?.slice(0, 5) || "",
            ]
              .filter(Boolean)
              .join(" - ");

            return (
              <div
                key={booking.id}
                className="rounded-[32px] border border-black/5 bg-[#F7F5F2] p-6 shadow-[0_14px_50px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_20px_70px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold">
                          {booking.full_name}
                        </h2>

                        <div
                          className={`rounded-full border px-4 py-2 text-xs font-medium ${getStatusClass(
                            currentStatus
                          )}`}
                        >
                          {currentStatus}
                        </div>

                        {priority && (
                          <div
                            className={`rounded-full px-4 py-2 text-xs font-medium ${priority.className}`}
                          >
                            {priority.label}
                          </div>
                        )}

                        {wasRescheduled && (
                          <div className="rounded-full bg-sky-600 px-4 py-2 text-xs font-medium text-white">
                            {booking.rescheduled_by === "patient"
                              ? "Reprogramada por paciente"
                              : "Reprogramada por admin"}
                          </div>
                        )}
                      </div>

                      {booking.email && (
                        <div className="mt-2 text-sm text-neutral-500">
                          {booking.email}
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-600">
                          {booking.clinic_name}
                        </div>

                        {booking.specialist_name && (
                          <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-600">
                            {booking.specialist_name}
                          </div>
                        )}

                        <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-600">
                          {booking.treatment}
                        </div>

                        {booking.booking_source && (
                          <div className="rounded-full bg-black px-4 py-2 text-sm text-white">
                            {sourceLabel}
                          </div>
                        )}

                        {priceFrom && (
                          <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-600">
                            Desde {priceFrom}
                          </div>
                        )}

                        {bookingContext.availability_checked && (
                          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                            Hueco validado
                          </div>
                        )}

                        <div className="rounded-full bg-white px-4 py-2 text-sm text-neutral-600">
                          {normalizeDate(booking.booking_date)}
                          {normalizeTime(
                            booking.booking_date,
                            booking.booking_time
                          )
                            ? ` - ${normalizeTime(
                                booking.booking_date,
                                booking.booking_time
                              )}`
                            : ""}
                        </div>
                      </div>

                      {wasRescheduled && previousSchedule && (
                        <p className="mt-4 text-sm text-sky-700">
                          Antes: {previousSchedule}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <Link
                        href={`/admin/reservas/${booking.id}`}
                        className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-neutral-700 transition hover:border-black"
                      >
                        Ver ficha
                      </Link>

                      {!isCompleted && (
                        <>
                          {currentStatus !== "Confirmada" && (
                            <button
                              onClick={() =>
                                updateBookingStatus(booking.id, "Confirmada")
                              }
                              disabled={isUpdating}
                              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                          )}

                          {currentStatus !== "Cancelada" && (
                            <button
                              onClick={() =>
                                updateBookingStatus(booking.id, "Cancelada")
                              }
                              disabled={isUpdating}
                              className="rounded-full bg-red-600 px-5 py-2.5 text-sm text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}

                          {currentStatus !== "No asistió" && (
                            <button
                              onClick={() =>
                                updateBookingStatus(booking.id, "No asistió")
                              }
                              disabled={isUpdating}
                              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              No asistió
                            </button>
                          )}
                        </>
                      )}

                      {isCompleted && (
                        <div className="rounded-full bg-black px-5 py-2.5 text-sm text-white">
                          Finalizada automáticamente
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setReprogrammingBooking(booking);
                          setNewDate(normalizeDate(booking.booking_date));
                          setNewTime(
                            normalizeTime(
                              booking.booking_date,
                              booking.booking_time
                            )
                          );
                        }}
                        disabled={isCompleted || isUpdating}
                        className="rounded-full bg-blue-600 px-5 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reprogramar
                      </button>

                      <BookingTimeline bookingId={booking.id} />

                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {reprogrammingBooking && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Reprogramar reserva
                </div>

                <h2 className="mt-3 text-3xl font-semibold">
                  {reprogrammingBooking.full_name}
                </h2>

                {reprogrammingBooking.specialist_name && (
                  <p className="mt-2 text-sm text-neutral-500">
                    Con {reprogrammingBooking.specialist_name}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setReprogrammingBooking(null);
                  setAvailableSlots([]);
                  setAvailabilityReason("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-8 grid gap-5">
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setNewTime("");
                }}
                className="h-14 rounded-2xl border border-black/10 px-5 outline-none"
              />

              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 rounded-2xl border border-black/10 px-5 outline-none"
              >
                <option value="">Seleccionar hora</option>

                {availableSlots.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>

              {newDate ? (
                <div
                  className={`rounded-2xl p-4 text-sm ${
                    availableSlots.length > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {availabilityLoading
                    ? "Consultando disponibilidad..."
                    : availableSlots.length > 0
                      ? `${availableSlots.length} huecos disponibles para ese dia.`
                      : availabilityReason ||
                        "No hay huecos disponibles para ese dia."}
                </div>
              ) : null}

              <button
                onClick={reprogramBooking}
                disabled={
                  updatingId === reprogrammingBooking.id ||
                  availabilityLoading ||
                  !newTime ||
                  !availableSlots.includes(newTime)
                }
                className="mt-3 h-14 rounded-2xl bg-black text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {updatingId === reprogrammingBooking.id
                  ? "Verificando..."
                  : "Guardar reprogramación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
