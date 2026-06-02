"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { normalizeBookingStatus } from "@/lib/booking-status";
import AdminShell from "@/components/AdminShell";
import BookingTimeline from "@/components/BookingTimeline";

type Clinic = {
  id: string | number;
  name: string;
};

type Specialist = {
  id: string | number;
  name: string;
  clinic_id?: string | number | null;
  clinic_name?: string | null;
};

type Treatment = {
  id: string | number;
  name: string;
};

type Booking = {
  id: string | number;
  booking_date?: string | null;
  booking_time?: string | null;
  full_name?: string | null;
  specialist_name?: string | null;
  treatment?: string | null;
  status?: string | null;
  duration_minutes?: number | string | null;
  rescheduled_at?: string | null;
  rescheduled_by?: "patient" | "admin" | null;
  previous_booking_date?: string | null;
  previous_booking_time?: string | null;
};

type BlockedDate = {
  id: string | number;
  blocked_date: string;
};

type BlockedTimeSlot = {
  id: string | number;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string | null;
};

type Vacation = {
  id: string | number;
  start_date: string;
  end_date: string;
  reason?: string | null;
};

type Availability = {
  id: string | number;
  weekday?: number | string | null;
  day_of_week?: number | string | null;
  start_time: string;
  end_time: string;
  active?: boolean | null;
  is_active?: boolean | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  max_daily_bookings?: number | string | null;
  slot_interval_minutes?: number | string | null;
};

type CalendarDay =
  | {
      date: Date;
      value: string;
      weekday: number;
    }
  | null;

type CalendarView = "month" | "week";

type AvailabilityScope =
  | "single"
  | "weekdays"
  | "all";

type ManualBookingForm = {
  clinic_name: string;
  specialist_name: string;
  full_name: string;
  email: string;
  booking_date: string;
  booking_time: string;
  treatment: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

type GoogleCalendarConnection = {
  specialist_id: string;
  specialist_name: string;
  google_email?: string | null;
  status?: string | null;
  requires_reconnect?: boolean | null;
};

type GoogleCalendarStatus = {
  configured: boolean;
  connection: GoogleCalendarConnection | null;
};

type SlotAvailability = {
  availableSlots: string[];
  blocked: boolean;
  reason?: string;
  error?: string;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isDateInRange(
  date: string,
  start: string,
  end: string
) {
  return date >= start && date <= end;
}

function normalizeStatus(status?: string | null) {
  return normalizeBookingStatus(status);
}

function getBookingTime(booking: Booking) {
  return (
    booking.booking_time ||
    booking.booking_date?.slice(11, 16) ||
    ""
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function isTimeInRange(
  time: string,
  start: string,
  end: string
) {
  const value = timeToMinutes(time);

  return (
    value >= timeToMinutes(start) &&
    value < timeToMinutes(end)
  );
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function timeRangesOverlap(
  startA: string,
  endA: string,
  startB?: string | null,
  endB?: string | null
) {
  if (!startB || !endB) return false;

  return (
    timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(endA) > timeToMinutes(startB)
  );
}

function getSlotEnd(slot: string, minutes = 30) {
  const total = timeToMinutes(slot) + minutes;
  const hours = String(Math.floor(total / 60)).padStart(
    2,
    "0"
  );
  const mins = String(total % 60).padStart(2, "0");

  return `${hours}:${mins}`;
}

function isTimeBlocked(
  time: string,
  blocks: BlockedTimeSlot[]
) {
  return blocks.some((block) =>
    isTimeInRange(
      time,
      block.start_time,
      block.end_time
    )
  );
}

function getStatusClasses(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized.includes("confirmada")) {
    return {
      card:
        "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
      pill: "bg-emerald-600 text-white",
      dot: "bg-emerald-500",
    };
  }

  if (normalized.includes("cancelada")) {
    return {
      card:
        "border-red-200 bg-red-50 text-red-950 hover:bg-red-100",
      pill: "bg-red-600 text-white",
      dot: "bg-red-500",
    };
  }

  if (normalized.includes("reprogramada")) {
    return {
      card:
        "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100",
      pill: "bg-sky-600 text-white",
      dot: "bg-sky-500",
    };
  }

  if (normalized.includes("pendiente")) {
    return {
      card:
        "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
      pill: "bg-amber-500 text-black",
      dot: "bg-amber-400",
    };
  }

  return {
    card:
      "border-neutral-200 bg-white text-black hover:bg-neutral-50",
    pill: "bg-black text-white",
    dot: "bg-neutral-400",
  };
}

function getDayStateClasses({
  isToday,
  blocked,
  vacation,
  hasBookings,
  hasAvailability,
}: {
  isToday: boolean;
  blocked: boolean;
  vacation: boolean;
  hasBookings: boolean;
  hasAvailability: boolean;
}) {
  if (blocked) {
    return "border-red-300/50 bg-red-500/15";
  }

  if (vacation) {
    return "border-amber-300/50 bg-amber-400/15";
  }

  if (hasBookings) {
    return "border-sky-300/35 bg-sky-400/10";
  }

  if (hasAvailability) {
    return "border-emerald-300/30 bg-emerald-400/10";
  }

  if (isToday) {
    return "border-emerald-300/50 bg-emerald-400/10";
  }

  return "border-white/10 bg-white/[0.04]";
}

const weekdays = [
  { label: "Domingo", value: 0 },
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
];

function isAvailabilityActive(item: Availability) {
  return item.is_active ?? item.active ?? true;
}

function getAvailabilityWeekday(item: Availability) {
  return Number(item.day_of_week ?? item.weekday);
}

export default function AdminAdvancedCalendarPage({
  isSuperAdmin,
  accessRole,
  permissions,
  status,
  clinicId,
  specialistId,
  specialistName,
}: {
  isSuperAdmin: boolean;
  accessRole?: string | null;
  permissions?: string[] | null;
  status?: string | null;
  clinicId?: number | null;
  specialistId?: string | number | null;
  specialistName?: string | null;
}) {
  const isSpecialistAccess = accessRole === "specialist";
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [specialists, setSpecialists] =
    useState<Specialist[]>([]);
  const [treatments, setTreatments] =
    useState<Treatment[]>([]);

  const [selectedClinic, setSelectedClinic] =
    useState("");

  const [
    selectedSpecialist,
    setSelectedSpecialist,
  ] = useState("");

  const [
    specialistFromUrl,
    setSpecialistFromUrl,
  ] = useState("");

  const [monthOffset, setMonthOffset] =
    useState(0);

  const [calendarView, setCalendarView] =
    useState<CalendarView>("month");

  const [weekOffset, setWeekOffset] =
    useState(0);

  const [blockedDate, setBlockedDate] =
    useState("");

  const [timeBlockDate, setTimeBlockDate] =
    useState("");

  const [timeBlockStart, setTimeBlockStart] =
    useState("13:00");

  const [timeBlockEnd, setTimeBlockEnd] =
    useState("14:00");

  const [timeBlockReason, setTimeBlockReason] =
    useState("");

  const [vacationStart, setVacationStart] =
    useState("");

  const [vacationEnd, setVacationEnd] =
    useState("");

  const [vacationReason, setVacationReason] =
    useState("");

  const [availabilityDay, setAvailabilityDay] =
    useState(1);

  const [
    availabilityScope,
    setAvailabilityScope,
  ] = useState<AvailabilityScope>("single");

  const [
    availabilityStart,
    setAvailabilityStart,
  ] = useState("09:00");

  const [availabilityEnd, setAvailabilityEnd] =
    useState("17:00");

  const [
    availabilityBreakStart,
    setAvailabilityBreakStart,
  ] = useState("13:00");

  const [
    availabilityBreakEnd,
    setAvailabilityBreakEnd,
  ] = useState("14:00");

  const [
    availabilityMaxDaily,
    setAvailabilityMaxDaily,
  ] = useState(0);

  const [
    availabilitySlotInterval,
    setAvailabilitySlotInterval,
  ] = useState(30);

  const [
    availabilityActive,
    setAvailabilityActive,
  ] = useState(true);

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [blockedDates, setBlockedDates] =
    useState<BlockedDate[]>([]);

  const [
    blockedTimeSlots,
    setBlockedTimeSlots,
  ] = useState<BlockedTimeSlot[]>([]);

  const [vacations, setVacations] =
    useState<Vacation[]>([]);

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [
    selectedBooking,
    setSelectedBooking,
  ] = useState<Booking | null>(null);

  const [
    rescheduleDate,
    setRescheduleDate,
  ] = useState("");

  const [
    rescheduleTime,
    setRescheduleTime,
  ] = useState("");

  const [
    rescheduleStatus,
    setRescheduleStatus,
  ] = useState("");

  const [
    rescheduleSlots,
    setRescheduleSlots,
  ] = useState<string[]>([]);

  const [
    rescheduleSlotReason,
    setRescheduleSlotReason,
  ] = useState("");

  const [
    rescheduleSlotsLoading,
    setRescheduleSlotsLoading,
  ] = useState(false);

  const [
    updateLoading,
    setUpdateLoading,
  ] = useState(false);

  const [draggedBooking, setDraggedBooking] =
    useState<Booking | null>(null);

  const [dragOverDate, setDragOverDate] =
    useState("");

  const [
    dragUpdateLoading,
    setDragUpdateLoading,
  ] = useState(false);

  const [
    manualBookingOpen,
    setManualBookingOpen,
  ] = useState(false);

  const [
    manualBookingLoading,
    setManualBookingLoading,
  ] = useState(false);

  const [
    manualBookingForm,
    setManualBookingForm,
  ] = useState<ManualBookingForm>({
    clinic_name: "",
    specialist_name: "",
    full_name: "",
    email: "",
    booking_date: "",
    booking_time: "",
    treatment: "",
  });

  const [feedback, setFeedback] =
    useState<Feedback>(null);

  const [loading, setLoading] =
    useState(false);

  const [
    unblockLoading,
    setUnblockLoading,
  ] = useState("");

  const [
    unblockTimeLoading,
    setUnblockTimeLoading,
  ] = useState("");

  const [
    deleteVacationLoading,
    setDeleteVacationLoading,
  ] = useState("");

  const [
    timeBlockLoading,
    setTimeBlockLoading,
  ] = useState(false);

  const [
    vacationLoading,
    setVacationLoading,
  ] = useState(false);

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    googleCalendarStatus,
    setGoogleCalendarStatus,
  ] = useState<GoogleCalendarStatus | null>(null);

  const [
    googleCalendarLoading,
    setGoogleCalendarLoading,
  ] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: clinicsData } =
        await supabase
          .from("clinics")
          .select("*")
          .order("name");

      const { data: specialistsData } =
        await supabase
          .from("specialists")
          .select("*")
          .order("name");

      const { data: treatmentsData } =
        await supabase
          .from("treatments")
          .select("*")
          .order("name");

      const visibleClinics =
        !isSuperAdmin && clinicId
          ? ((clinicsData || []) as Clinic[]).filter(
              (clinic) => Number(clinic.id) === Number(clinicId)
            )
          : ((clinicsData || []) as Clinic[]);

      if (clinicsData) {
        setClinics(visibleClinics);
      }

      if (specialistsData) {
        const scopedSpecialists = ((specialistsData || []) as Specialist[])
          .filter((specialist) => {
            if (isSpecialistAccess && specialistId) {
              return String(specialist.id) === String(specialistId);
            }

            if (!isSuperAdmin && clinicId) {
              return visibleClinics.some(
                (clinic) =>
                  String(specialist.clinic_name || "") === clinic.name ||
                  Number((specialist as Specialist & { clinic_id?: number | string }).clinic_id || 0) ===
                    Number(clinicId)
              );
            }

            return true;
          });

        setSpecialists(
          scopedSpecialists
        );
      }

      if (treatmentsData) {
        setTreatments(
          treatmentsData as Treatment[]
        );
      }
    }

    loadData();
  }, [clinicId, isSpecialistAccess, isSuperAdmin, specialistId]);

  useEffect(() => {
    if (!isSpecialistAccess || !specialistName) return;

    setSelectedSpecialist(specialistName);
  }, [isSpecialistAccess, specialistName]);

  useEffect(() => {
    if (isSpecialistAccess) return;

    const params = new URLSearchParams(
      window.location.search
    );
    setSpecialistFromUrl(
      params.get("specialist") || ""
    );
  }, [isSpecialistAccess]);

  useEffect(() => {
    if (isSpecialistAccess) return;

    if (
      !specialistFromUrl ||
      specialists.length === 0 ||
      selectedSpecialist
    ) {
      return;
    }

    const specialist = specialists.find(
      (item) =>
        item.name.toLowerCase().trim() ===
        specialistFromUrl.toLowerCase().trim()
    );

    if (specialist) {
      setSelectedSpecialist(specialist.name);
      setSelectedClinic(specialist.clinic_name || "");
    }
  }, [
    specialistFromUrl,
    specialists,
    selectedSpecialist,
    isSpecialistAccess,
  ]);

  useEffect(() => {
    async function loadCalendarData() {
      if (!selectedSpecialist) {
        setBookings([]);
        setBlockedDates([]);
        setBlockedTimeSlots([]);
        setVacations([]);
        setAvailability([]);
        return;
      }

      const { data: bookingsData } =
        await supabase
          .from("bookings")
          .select("*")
          .eq(
            "specialist_name",
            selectedSpecialist
          );

      const { data: blockedData } =
        await supabase
          .from("blocked_dates")
          .select("*")
          .eq(
            "specialist_name",
            selectedSpecialist
          );

      const { data: blockedTimeData } =
        await supabase
          .from("blocked_time_slots")
          .select("*")
          .eq(
            "specialist_name",
            selectedSpecialist
          );

      const { data: vacationsData } =
        await supabase
          .from("specialist_vacations")
          .select("*")
          .eq(
            "specialist_name",
            selectedSpecialist
          );

      const { data: availabilityData } =
        await supabase
          .from("specialist_availability")
          .select("*")
          .eq(
            "specialist_name",
            selectedSpecialist
          );

      setBookings((bookingsData || []) as Booking[]);
      setBlockedDates((blockedData || []) as BlockedDate[]);
      setBlockedTimeSlots(
        (blockedTimeData || []) as BlockedTimeSlot[]
      );
      setVacations((vacationsData || []) as Vacation[]);
      setAvailability(
        (availabilityData || []) as Availability[]
      );
    }

    loadCalendarData();
  }, [selectedSpecialist]);

  useEffect(() => {
    const currentDayAvailability = availability.find(
      (item) => getAvailabilityWeekday(item) === availabilityDay
    );

    if (!currentDayAvailability) {
      return;
    }

    setAvailabilityStart(currentDayAvailability.start_time?.slice(0, 5) || "09:00");
    setAvailabilityEnd(currentDayAvailability.end_time?.slice(0, 5) || "17:00");
    setAvailabilityBreakStart(
      currentDayAvailability.break_start_time?.slice(0, 5) || ""
    );
    setAvailabilityBreakEnd(
      currentDayAvailability.break_end_time?.slice(0, 5) || ""
    );
    setAvailabilityMaxDaily(Number(currentDayAvailability.max_daily_bookings || 0));
    setAvailabilitySlotInterval(
      Number(currentDayAvailability.slot_interval_minutes || 30)
    );
    setAvailabilityActive(isAvailabilityActive(currentDayAvailability));
  }, [availability, availabilityDay]);

  const filteredSpecialists =
    useMemo(() => {
      if (!selectedClinic) {
        return specialists;
      }

      return specialists.filter(
        (specialist) =>
          specialist.clinic_name ===
          selectedClinic
      );
    }, [selectedClinic, specialists]);

  const selectedSpecialistProfile = useMemo(
    () =>
      specialists.find(
        (specialist) =>
          specialist.name === selectedSpecialist
      ),
    [selectedSpecialist, specialists]
  );

  useEffect(() => {
    if (!isSpecialistAccess || !selectedSpecialistProfile?.clinic_name) return;

    setSelectedClinic(selectedSpecialistProfile.clinic_name);
  }, [isSpecialistAccess, selectedSpecialistProfile?.clinic_name]);

  useEffect(() => {
    async function loadGoogleCalendarStatus() {
      if (!selectedSpecialistProfile?.id) {
        setGoogleCalendarStatus(null);
        return;
      }

      const response = await fetch(
        `/api/google-calendar/status?specialistId=${encodeURIComponent(
          String(selectedSpecialistProfile.id)
        )}`
      );

      if (!response.ok) {
        setGoogleCalendarStatus(null);
        return;
      }

      const data = await response.json();
      setGoogleCalendarStatus({
        configured: Boolean(data.configured),
        connection: data.connection || null,
      });
    }

    loadGoogleCalendarStatus();
  }, [selectedSpecialistProfile?.id]);

  const activeAvailability = useMemo(
    () => availability.filter(isAvailabilityActive),
    [availability]
  );

  const activeWeekdays = useMemo(
    () =>
      new Set(
        activeAvailability.map((item) =>
          getAvailabilityWeekday(item)
        )
      ),
    [activeAvailability]
  );

  const scheduleScore = Math.round(
    (activeWeekdays.size / weekdays.length) * 100
  );

  const nextSuggestedDay =
    weekdays.find((day) => !activeWeekdays.has(day.value)) ||
    weekdays[1];

  const calendarDays = useMemo(() => {
    const today = new Date();

    const currentMonth =
      new Date(
        today.getFullYear(),
        today.getMonth() +
          monthOffset,
        1
      );

    const year =
      currentMonth.getFullYear();

    const month =
      currentMonth.getMonth();

    const firstDay =
      new Date(year, month, 1);

    const lastDay =
      new Date(year, month + 1, 0);

    const daysInMonth =
      lastDay.getDate();

    const startWeekday =
      firstDay.getDay();

    const days: CalendarDay[] = [];

    for (
      let i = 0;
      i < startWeekday;
      i++
    ) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const date =
        new Date(
          year,
          month,
          day
        );

      days.push({
        date,
        value:
          formatDate(date),
        weekday:
          date.getDay(),
      });
    }

    return {
      monthLabel:
        currentMonth.toLocaleDateString(
          "es-ES",
          {
            month: "long",
            year: "numeric",
          }
        ),

      days,
    };
  }, [monthOffset]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const start = getStartOfWeek(
      addDays(today, weekOffset * 7)
    );

    return Array.from({ length: 7 }).map(
      (_, index) => {
        const date = addDays(start, index);

        return {
          date,
          value: formatDate(date),
          weekday: date.getDay(),
        };
      }
    );
  }, [weekOffset]);

  const timeSlots = useMemo(() => {
    return Array.from({ length: 22 }).map(
      (_, index) => {
        const hour = 8 + Math.floor(index / 2);
        const minutes = index % 2 === 0 ? "00" : "30";

        return `${String(hour).padStart(
          2,
          "0"
        )}:${minutes}`;
      }
    );
  }, []);

  const weekLabel = useMemo(() => {
    const first = weekDays[0]?.date;
    const last =
      weekDays[weekDays.length - 1]?.date;

    if (!first || !last) return "";

    return `${first.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })} - ${last.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }, [weekDays]);

  function showFeedback(
    type: "success" | "error",
    message: string
  ) {
    setFeedback({
      type,
      message,
    });
  }

  function handleSelectSpecialist(name: string) {
    setSelectedSpecialist(name);

    const specialist = specialists.find(
      (item) => item.name === name
    );

    if (specialist?.clinic_name) {
      setSelectedClinic(specialist.clinic_name);
    }

    const params = new URLSearchParams(window.location.search);

    if (name) {
      params.set("specialist", name);
    } else {
      params.delete("specialist");
    }

    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `/admin/calendar?${query}` : "/admin/calendar"
    );
  }

  async function refreshCalendarData() {
    if (!selectedSpecialist) return;

    const { data: blockedData } =
      await supabase
        .from("blocked_dates")
        .select("*")
        .eq(
          "specialist_name",
          selectedSpecialist
        );

    const { data: blockedTimeData } =
      await supabase
        .from("blocked_time_slots")
        .select("*")
        .eq(
          "specialist_name",
          selectedSpecialist
        );

    const { data: vacationsData } =
      await supabase
        .from("specialist_vacations")
        .select("*")
        .eq(
          "specialist_name",
          selectedSpecialist
        );

    const { data: availabilityData } =
      await supabase
        .from("specialist_availability")
        .select("*")
        .eq(
          "specialist_name",
          selectedSpecialist
        );

    const { data: bookingsData } =
      await supabase
        .from("bookings")
        .select("*")
        .eq(
          "specialist_name",
          selectedSpecialist
        );

    setBookings((bookingsData || []) as Booking[]);
    setBlockedDates((blockedData || []) as BlockedDate[]);
    setBlockedTimeSlots(
      (blockedTimeData || []) as BlockedTimeSlot[]
    );
    setVacations((vacationsData || []) as Vacation[]);
    setAvailability(
      (availabilityData || []) as Availability[]
    );
  }

  async function handleBlockDate() {
    if (
      !selectedSpecialist ||
      !blockedDate
    ) {
      showFeedback(
        "error",
        "Selecciona especialista y fecha"
      );

      return;
    }

    setLoading(true);

    const res = await fetch(
      "/api/block-date",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          specialist_name:
            selectedSpecialist,
          blocked_date:
            blockedDate,
        }),
      }
    );

    const data =
      await res.json();

    setLoading(false);

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "Error al bloquear día"
      );

      return;
    }

    showFeedback(
      "success",
      "Día bloqueado correctamente"
    );

    setBlockedDate("");

    refreshCalendarData();
  }

  async function handleUnblockDate(date: string) {
    if (!selectedSpecialist || !date) {
      showFeedback(
        "error",
        "Selecciona especialista y fecha"
      );

      return;
    }

    setUnblockLoading(date);

    const res = await fetch(
      "/api/unblock-date",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          specialist_name:
            selectedSpecialist,
          blocked_date: date,
        }),
      }
    );

    const data = await res.json();

    setUnblockLoading("");

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "Error al desbloquear día"
      );

      return;
    }

    showFeedback(
      "success",
      "Día desbloqueado correctamente"
    );

    refreshCalendarData();
  }

  async function handleBlockTimeSlot() {
    if (
      !selectedSpecialist ||
      !timeBlockDate ||
      !timeBlockStart ||
      !timeBlockEnd
    ) {
      showFeedback(
        "error",
        "Selecciona especialista, fecha y horario"
      );

      return;
    }

    if (
      timeBlockStart >=
      timeBlockEnd
    ) {
      showFeedback(
        "error",
        "La hora de inicio debe ser menor que la hora de fin"
      );

      return;
    }

    setTimeBlockLoading(true);

    const res = await fetch(
      "/api/block-time-slot",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          specialist_name:
            selectedSpecialist,

          blocked_date:
            timeBlockDate,

          start_time:
            timeBlockStart,

          end_time:
            timeBlockEnd,

          reason:
            timeBlockReason ||
            "Bloqueo horario",
        }),
      }
    );

    const data =
      await res.json();

    setTimeBlockLoading(false);

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "Error al bloquear horario"
      );

      return;
    }

    showFeedback(
      "success",
      "Horario bloqueado correctamente"
    );

    setTimeBlockDate("");
    setTimeBlockStart("13:00");
    setTimeBlockEnd("14:00");
    setTimeBlockReason("");

    refreshCalendarData();
  }

  async function handleUnblockTimeSlot(slotId: string | number) {
    if (!selectedSpecialist || !slotId) {
      showFeedback(
        "error",
        "Selecciona especialista y bloqueo horario"
      );

      return;
    }

    const loadingKey = String(slotId);
    setUnblockTimeLoading(loadingKey);

    const res = await fetch("/api/unblock-time-slot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: slotId,
        specialist_name: selectedSpecialist,
      }),
    });

    const data = await res.json();

    setUnblockTimeLoading("");

    if (!res.ok) {
      showFeedback(
        "error",
        data.error || "Error al quitar bloqueo horario"
      );

      return;
    }

    showFeedback(
      "success",
      "Bloqueo horario eliminado correctamente"
    );

    refreshCalendarData();
  }

  async function handleSetVacation() {
    if (
      !selectedSpecialist ||
      !vacationStart ||
      !vacationEnd
    ) {
      showFeedback(
        "error",
        "Selecciona especialista, inicio y fin de vacaciones"
      );

      return;
    }

    if (
      vacationStart >
      vacationEnd
    ) {
      showFeedback(
        "error",
        "La fecha de inicio no puede ser posterior a la fecha de fin"
      );

      return;
    }

    setVacationLoading(true);

    const res = await fetch(
      "/api/set-vacation",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          specialist_name:
            selectedSpecialist,

          start_date:
            vacationStart,

          end_date:
            vacationEnd,

          reason:
            vacationReason ||
            "Vacaciones",
        }),
      }
    );

    const data =
      await res.json();

    setVacationLoading(false);

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "Error al guardar vacaciones"
      );

      return;
    }

    showFeedback(
      "success",
      "Vacaciones guardadas correctamente"
    );

    setVacationStart("");
    setVacationEnd("");
    setVacationReason("");

    refreshCalendarData();
  }

  async function handleDeleteVacation(vacationId: string | number) {
    if (!selectedSpecialist || !vacationId) {
      showFeedback(
        "error",
        "Selecciona especialista y vacaciones"
      );

      return;
    }

    const loadingKey = String(vacationId);
    setDeleteVacationLoading(loadingKey);

    const res = await fetch("/api/delete-vacation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: vacationId,
        specialist_name: selectedSpecialist,
      }),
    });

    const data = await res.json();

    setDeleteVacationLoading("");

    if (!res.ok) {
      showFeedback(
        "error",
        data.error || "Error al eliminar vacaciones"
      );

      return;
    }

    showFeedback(
      "success",
      "Vacaciones eliminadas correctamente"
    );

    refreshCalendarData();
  }

  async function handleSetAvailability(
    scopeOverride?: AvailabilityScope
  ) {
    if (!selectedSpecialist) {
      showFeedback(
        "error",
        "Selecciona un especialista"
      );

      return;
    }

    if (
      !availabilityStart ||
      !availabilityEnd
    ) {
      showFeedback(
        "error",
        "Selecciona horario de inicio y fin"
      );

      return;
    }

    if (
      availabilityStart >=
      availabilityEnd
    ) {
      showFeedback(
        "error",
        "La hora de inicio debe ser menor que la hora de fin"
      );

      return;
    }

    if (
      availabilityBreakStart &&
      availabilityBreakEnd &&
      availabilityBreakStart >=
        availabilityBreakEnd
    ) {
      showFeedback(
        "error",
        "El descanso debe terminar despues de empezar"
      );

      return;
    }

    if (
      availabilityBreakStart &&
      availabilityBreakEnd &&
      (availabilityBreakStart <
        availabilityStart ||
        availabilityBreakEnd >
          availabilityEnd)
    ) {
      showFeedback(
        "error",
        "El descanso debe quedar dentro del horario laboral"
      );

      return;
    }

    if (
      availabilitySlotInterval < 5 ||
      availabilitySlotInterval > 120
    ) {
      showFeedback(
        "error",
        "El intervalo debe estar entre 5 y 120 minutos"
      );

      return;
    }

    setAvailabilityLoading(true);

    const effectiveScope =
      scopeOverride || availabilityScope;

    const selectedDays =
      effectiveScope === "weekdays"
        ? [1, 2, 3, 4, 5]
        : effectiveScope === "all"
          ? [0, 1, 2, 3, 4, 5, 6]
          : [availabilityDay];

    const responses = await Promise.all(
      selectedDays.map((day) =>
        fetch("/api/set-availability", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
          specialist_name:
            selectedSpecialist,

          day_of_week:
            day,

          weekday:
            day,

          start_time:
            availabilityStart,

          end_time:
            availabilityEnd,

          active:
            availabilityActive,

          is_active:
            availabilityActive,

          break_start_time:
            availabilityBreakStart || null,

          break_end_time:
            availabilityBreakEnd || null,

          max_daily_bookings:
            availabilityMaxDaily,

          slot_interval_minutes:
            availabilitySlotInterval,
          }),
        })
      )
    );

    const results = await Promise.all(
      responses.map((response) =>
        response.json()
      )
    );

    setAvailabilityLoading(false);

    const failedIndex = responses.findIndex(
      (response) => !response.ok
    );

    if (failedIndex >= 0) {
      showFeedback(
        "error",
        results[failedIndex]?.error ||
          "Error al guardar horario"
      );

      return;
    }

    showFeedback(
      "success",
      effectiveScope === "single"
        ? "Horario guardado correctamente"
        : "Horarios guardados correctamente"
    );

    refreshCalendarData();
  }

  useEffect(() => {
    if (!selectedBooking || !rescheduleDate) {
      setRescheduleSlots([]);
      setRescheduleSlotReason("");
      return;
    }

    const specialist =
      selectedBooking.specialist_name || selectedSpecialist;

    if (!specialist) {
      setRescheduleSlots([]);
      setRescheduleSlotReason(
        "La reserva no tiene especialista asignado"
      );
      return;
    }

    const controller = new AbortController();

    async function loadRescheduleSlots() {
      setRescheduleSlotsLoading(true);
      setRescheduleSlotReason("");

      const params = new URLSearchParams({
        specialist,
        date: rescheduleDate,
        duration: String(
          Number(selectedBooking?.duration_minutes) || 60
        ),
        bookingId: String(selectedBooking?.id || ""),
      });

      try {
        const res = await fetch(`/api/booked-slots?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as SlotAvailability;

        if (!res.ok || data.error) {
          setRescheduleSlots([]);
          setRescheduleSlotReason(
            data.error || "No se pudo cargar la disponibilidad"
          );
          return;
        }

        const slots = data.availableSlots || [];

        setRescheduleSlots(slots);
        setRescheduleSlotReason(data.reason || "");

        if (
          rescheduleTime &&
          !slots.includes(rescheduleTime)
        ) {
          setRescheduleTime("");
        }
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setRescheduleSlots([]);
        setRescheduleSlotReason(
          "No se pudo cargar la disponibilidad"
        );
      } finally {
        setRescheduleSlotsLoading(false);
      }
    }

    loadRescheduleSlots();

    return () => controller.abort();
  }, [
    rescheduleDate,
    rescheduleTime,
    selectedBooking,
    selectedSpecialist,
  ]);

  async function handleUpdateBooking() {
    if (!selectedBooking) return;

    if (
      rescheduleStatus !== "Cancelada" &&
      rescheduleDate &&
      rescheduleTime &&
      !rescheduleSlots.includes(rescheduleTime)
    ) {
      showFeedback(
        "error",
        rescheduleSlotReason ||
          "Selecciona un hueco disponible para este especialista"
      );
      return;
    }

    setUpdateLoading(true);

    const res = await fetch(
      "/api/update-booking",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          booking_id:
            selectedBooking.id,
          booking_date:
            rescheduleDate,
          booking_time:
            rescheduleTime,
          status:
            rescheduleStatus,
        }),
      }
    );

    const data = await res.json();

    setUpdateLoading(false);

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "Error actualizando reserva"
      );

      return;
    }

    showFeedback(
      "success",
      "Reserva actualizada"
    );
    setSelectedBooking(null);
    refreshCalendarData();
  }

  async function handleDropBooking(
    targetDate: string,
    targetTime?: string
  ) {
    if (!draggedBooking || dragUpdateLoading) {
      return;
    }

    const currentDate =
      draggedBooking.booking_date?.slice(0, 10) || "";
    const currentTime =
      getBookingTime(draggedBooking);
    const nextTime =
      targetTime || currentTime;

    setDragOverDate("");

    if (!currentTime) {
      showFeedback(
        "error",
        "La reserva no tiene hora definida para reprogramar"
      );
      setDraggedBooking(null);
      return;
    }

    if (
      currentDate === targetDate &&
      currentTime === nextTime
    ) {
      setDraggedBooking(null);
      return;
    }

    setDragUpdateLoading(true);

    const res = await fetch(
      "/api/update-booking",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          booking_id:
            draggedBooking.id,
          booking_date:
            targetDate,
          booking_time:
            nextTime,
          status:
            "Reprogramada",
        }),
      }
    );

    const data = await res.json();

    setDragUpdateLoading(false);
    setDraggedBooking(null);

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "No se pudo reprogramar la reserva"
      );

      return;
    }

    refreshCalendarData();
  }

  function openManualBooking(
    bookingDate: string,
    bookingTime: string
  ) {
    if (!selectedSpecialist) {
      showFeedback(
        "error",
        "Selecciona un especialista antes de crear una reserva"
      );
      return;
    }

    const specialist =
      specialists.find(
        (item) =>
          item.name === selectedSpecialist
      );

    setManualBookingForm({
      clinic_name:
        selectedClinic ||
        specialist?.clinic_name ||
        "",
      specialist_name:
        selectedSpecialist,
      full_name: "",
      email: "",
      booking_date:
        bookingDate,
      booking_time:
        bookingTime,
      treatment: "",
    });

    setManualBookingOpen(true);
  }

  async function handleCreateManualBooking(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setManualBookingLoading(true);

    const res = await fetch(
      "/api/create-manual-booking",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          manualBookingForm
        ),
      }
    );

    const data = await res.json();

    setManualBookingLoading(false);

    if (!res.ok) {
      showFeedback(
        "error",
        data.error ||
          "Error creando reserva"
      );
      return;
    }

    setManualBookingOpen(false);
    showFeedback(
      "success",
      "Reserva creada correctamente"
    );
    refreshCalendarData();
  }

  async function handleDisconnectGoogleCalendar() {
    if (!selectedSpecialistProfile?.id) return;

    setGoogleCalendarLoading(true);

    const response = await fetch("/api/google-calendar/disconnect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        specialistId: selectedSpecialistProfile.id,
      }),
    });

    setGoogleCalendarLoading(false);

    if (!response.ok) {
      showFeedback("error", "No pudimos desconectar Google Calendar");
      return;
    }

    showFeedback("success", "Google Calendar desconectado");
    setGoogleCalendarStatus((current) =>
      current
        ? {
            ...current,
            connection: current.connection
              ? { ...current.connection, status: "disconnected" }
              : null,
          }
        : current
    );
  }

  return (
    <AdminShell
      isSuperAdmin={isSuperAdmin}
      accessRole={accessRole}
      permissions={permissions}
      status={status}
    >
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Agenda avanzada
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight">
          Planificacion diaria.
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-500">
          Gestiona reservas,
          bloqueos,
          vacaciones y
          disponibilidad real por
          clínica y especialista.
        </p>
      </div>

      <Link
        href="/admin/reservas"
        className="mt-8 inline-flex rounded-full border border-black/10 bg-white px-6 py-3 text-sm transition hover:border-black"
      >
        Ver cola de reservas
      </Link>

      {feedback && (
        <div
          className={`mt-8 flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{feedback.message}</span>

          <button
            type="button"
            onClick={() =>
              setFeedback(null)
            }
            className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] opacity-70 transition hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <select
          value={selectedClinic}
          disabled={isSpecialistAccess}
          onChange={(e) => {
            if (isSpecialistAccess) return;
            setSelectedClinic(
              e.target.value
            );

            setSelectedSpecialist(
              ""
            );
            const params = new URLSearchParams(window.location.search);
            params.delete("specialist");
            const query = params.toString();
            window.history.replaceState(
              null,
              "",
              query ? `/admin/calendar?${query}` : "/admin/calendar"
            );
          }}
          className="h-14 rounded-2xl border border-black/10 bg-white px-5 outline-none disabled:bg-neutral-100 disabled:text-neutral-500"
        >
          <option value="">
            Seleccionar clínica
          </option>

          {clinics.map((clinic) => (
            <option
              key={clinic.id}
              value={clinic.name}
            >
              {clinic.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSpecialist}
          disabled={isSpecialistAccess}
          onChange={(e) =>
            handleSelectSpecialist(
              e.target.value
            )
          }
          className="h-14 rounded-2xl border border-black/10 bg-white px-5 outline-none disabled:bg-neutral-100 disabled:text-neutral-500"
        >
          <option value="">
            Seleccionar especialista
          </option>

          {filteredSpecialists.map(
            (specialist) => (
              <option
                key={
                  specialist.id
                }
                value={
                  specialist.name
                }
              >
                {specialist.name}
              </option>
            )
          )}
        </select>
      </div>

      {selectedSpecialist && (
        <section className="mt-6 rounded-[32px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Agenda del especialista
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {selectedSpecialist}
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                {selectedSpecialistProfile?.clinic_name ||
                  "Clinica sin asignar"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-3xl bg-[#F8F5F1] p-4">
                <div className="text-2xl font-semibold">
                  {activeWeekdays.size}/7
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Dias activos
                </div>
              </div>

              <div className="rounded-3xl bg-[#F8F5F1] p-4">
                <div className="text-2xl font-semibold">{bookings.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Reservas
                </div>
              </div>

              <div className="rounded-3xl bg-[#F8F5F1] p-4">
                <div className="text-2xl font-semibold">
                  {blockedDates.length + blockedTimeSlots.length}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Bloqueos
                </div>
              </div>

              <div className="rounded-3xl bg-[#F8F5F1] p-4">
                <div className="text-2xl font-semibold">{vacations.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Vacaciones
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-black/10 bg-[#F8F5F1] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Google Calendar
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  {googleCalendarStatus?.connection?.requires_reconnect
                    ? "Permisos incompletos"
                    : googleCalendarStatus?.connection?.status === "connected"
                    ? "Agenda conectada"
                    : "Agenda no conectada"}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  {googleCalendarStatus?.connection?.requires_reconnect
                    ? "Reconecta la agenda y acepta el permiso para crear y actualizar eventos."
                    : googleCalendarStatus?.connection?.google_email
                    ? googleCalendarStatus.connection.google_email
                    : googleCalendarStatus?.configured === false
                      ? "Faltan credenciales de Google en el entorno."
                      : "Sincroniza reservas confirmadas con la agenda externa del especialista."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {googleCalendarStatus?.connection?.requires_reconnect && (
                  <Link
                    href={
                      selectedSpecialistProfile?.id
                        ? `/api/google-calendar/connect?specialistId=${encodeURIComponent(
                            String(selectedSpecialistProfile.id)
                          )}`
                        : "#"
                    }
                    className={`rounded-full px-5 py-3 text-sm ${
                      googleCalendarStatus?.configured === false ||
                      !selectedSpecialistProfile?.id
                        ? "pointer-events-none bg-neutral-300 text-neutral-500"
                        : "bg-black text-white"
                    }`}
                  >
                    Reconectar Google
                  </Link>
                )}
                {googleCalendarStatus?.connection?.status === "connected" ? (
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleCalendar}
                    disabled={googleCalendarLoading}
                    className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm disabled:opacity-50"
                  >
                    Desconectar
                  </button>
                ) : (
                  <Link
                    href={
                      selectedSpecialistProfile?.id
                        ? `/api/google-calendar/connect?specialistId=${encodeURIComponent(
                            String(selectedSpecialistProfile.id)
                          )}`
                        : "#"
                    }
                    className={`rounded-full px-5 py-3 text-sm ${
                      googleCalendarStatus?.configured === false ||
                      !selectedSpecialistProfile?.id
                        ? "pointer-events-none bg-neutral-300 text-neutral-500"
                        : "bg-black text-white"
                    }`}
                  >
                    Conectar Google
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium">Cobertura semanal</span>
              <span className="text-neutral-500">{scheduleScore}%</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECE7DF]">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{ width: `${scheduleScore}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {weekdays.map((day) => {
                const active = activeWeekdays.has(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      setAvailabilityDay(day.value);
                      setAvailabilityScope("single");
                    }}
                    className={`rounded-full border px-4 py-2 text-xs transition ${
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-black/10 bg-white text-neutral-500 hover:border-black hover:text-black"
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {activeWeekdays.size === 0 && (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
              Este especialista todavia no tiene horario activo. Usa el bloque
              &quot;Horario del doctor&quot; para crear su primera semana laboral.
            </div>
          )}

          {activeWeekdays.size > 0 && activeWeekdays.size < weekdays.length && (
            <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-black/5 bg-[#F8F5F1] p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">Siguiente mejora sugerida</div>
                <div className="mt-1 text-neutral-500">
                  Revisar o activar {nextSuggestedDay.label.toLowerCase()} si
                  tambien atiende ese dia.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAvailabilityDay(nextSuggestedDay.value);
                  setAvailabilityScope("single");
                }}
                className="rounded-full bg-black px-5 py-3 text-sm text-white"
              >
                Configurar dia
              </button>
            </div>
          )}
        </section>
      )}

      <div className="mt-12 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-[36px] bg-[#080808] p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)] xl:col-span-2 lg:p-8">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                {calendarView === "month"
                  ? "Vista mensual"
                  : "Vista semanal"}
              </p>

              <h2 className="mt-4 text-3xl font-semibold">
                Calendario operativo
              </h2>

              <p className="mt-3 text-sm text-white/45">
                {calendarView === "month"
                  ? "Arrastra una reserva a otro día para reprogramarla con la misma hora."
                  : "Arrastra una reserva a otra franja para cambiar día y hora."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarView("month")
                  }
                  className={`rounded-xl px-4 py-2 transition ${
                    calendarView === "month"
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Mes
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCalendarView("week")
                  }
                  className={`rounded-xl px-4 py-2 transition ${
                    calendarView === "week"
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Semana
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {[
                  ["Confirmada", "bg-emerald-500"],
                  ["Pendiente", "bg-amber-400"],
                  ["Reprogramada", "bg-sky-500"],
                  ["Cancelada", "bg-red-500"],
                ].map(([label, color]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-white/70"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${color}`}
                    />
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {[
                  ["Horario", "bg-emerald-300"],
                  ["Reserva", "bg-sky-300"],
                  ["Bloqueo", "bg-red-400"],
                  ["Vacaciones", "bg-amber-300"],
                ].map(([label, color]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-white/70"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() =>
                calendarView === "month"
                  ? setMonthOffset(
                      (value) =>
                        value - 1
                    )
                  : setWeekOffset(
                      (value) =>
                        value - 1
                    )
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white hover:text-black"
            >
              ←{" "}
              {calendarView === "month"
                ? "Mes anterior"
                : "Semana anterior"}
            </button>

            <div className="text-lg font-medium capitalize">
              {calendarView === "month"
                ? calendarDays.monthLabel
                : weekLabel}
            </div>

            <button
              onClick={() =>
                calendarView === "month"
                  ? setMonthOffset(
                      (value) =>
                        value + 1
                    )
                  : setWeekOffset(
                      (value) =>
                        value + 1
                    )
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white hover:text-black"
            >
              {calendarView === "month"
                ? "Mes siguiente"
                : "Semana siguiente"}{" "}
              →
            </button>
          </div>

          {dragUpdateLoading && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/70">
              Reprogramando reserva...
            </div>
          )}

          {calendarView === "month" ? (
            <>
          <div className="mt-8 grid grid-cols-7 gap-3">
            {[
              "Dom",
              "Lun",
              "Mar",
              "Mié",
              "Jue",
              "Vie",
              "Sáb",
            ].map((day) => (
              <div
                key={day}
                className="rounded-2xl bg-white/10 p-4 text-center text-sm text-white/60"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 lg:gap-3">
            {calendarDays.days.map(
              (
                day,
                index
              ) => {
                if (!day) {
                  return (
                    <div
                      key={index}
                      className="min-h-[260px] rounded-2xl border border-white/5 bg-white/[0.02]"
                    />
                  );
                }

                const dayBookings =
                  bookings.filter(
                    (
                      booking
                    ) =>
                      booking.booking_date?.slice(
                        0,
                        10
                      ) ===
                      day.value
                  );

                const dayTimeBlocks =
                  blockedTimeSlots.filter(
                    (
                      slot
                    ) =>
                      slot.blocked_date ===
                      day.value
                  );

                const blocked =
                  blockedDates.some(
                    (
                      blockedDay
                    ) =>
                      blockedDay.blocked_date ===
                      day.value
                  );

                const vacation =
                  vacations.find(
                    (
                      vacationItem
                    ) =>
                      isDateInRange(
                        day.value,
                        vacationItem.start_date,
                        vacationItem.end_date
                      )
                  );

                const dayAvailability =
                  availability.find(
                    (
                      item
                    ) =>
                      Number(
                        item.day_of_week ??
                          item.weekday
                      ) ===
                        day.weekday &&
                      (
                        item.is_active ??
                        item.active ??
                        true
                      )
                  );

                const isToday =
                  day.value ===
                  formatDate(new Date());

                const dayStateClasses =
                  getDayStateClasses({
                    isToday,
                    blocked,
                    vacation:
                      Boolean(vacation),
                    hasBookings:
                      dayBookings.length > 0,
                    hasAvailability:
                      Boolean(dayAvailability),
                  });

                const dailyLimit = Number(
                  dayAvailability?.max_daily_bookings || 0
                );
                const occupancy =
                  dailyLimit > 0
                    ? Math.min(
                        100,
                        Math.round((dayBookings.length / dailyLimit) * 100)
                      )
                    : dayBookings.length > 0
                      ? 100
                      : 0;
                const dayBadges = [
                  dayAvailability ? "Horario" : "",
                  blocked ? "Bloqueo" : "",
                  vacation ? "Vacaciones" : "",
                  dayTimeBlocks.length > 0 ? `${dayTimeBlocks.length} horas` : "",
                ].filter(Boolean);

                const isDropTarget =
                  dragOverDate === day.value;

                return (
                  <div
                    key={
                      day.value +
                      index
                    }
                    onDragOver={(event) => {
                      if (draggedBooking) {
                        event.preventDefault();
                      }
                    }}
                    onDragEnter={() => {
                      if (draggedBooking) {
                        setDragOverDate(
                          day.value
                        );
                      }
                    }}
                    onDragLeave={(event) => {
                      if (
                        event.currentTarget ===
                        event.target
                      ) {
                        setDragOverDate("");
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDropBooking(
                        day.value
                      );
                    }}
                    className={`min-h-[260px] rounded-2xl border p-3 transition ${dayStateClasses} ${
                      isDropTarget
                        ? "scale-[1.01] ring-2 ring-white/70"
                        : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xl font-semibold">
                          {
                            day.date.getDate()
                          }
                        </div>

                        {isToday && (
                          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                            Hoy
                          </div>
                        )}
                      </div>

                      {dayBookings.length > 0 && (
                        <div className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-black">
                          {
                            dayBookings.length
                          }
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/35">
                        <span>Ocupacion</span>
                        <span>
                          {dailyLimit > 0
                            ? `${dayBookings.length}/${dailyLimit}`
                            : `${dayBookings.length}`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            blocked || vacation
                              ? "bg-red-300"
                              : occupancy >= 90
                                ? "bg-sky-300"
                                : "bg-emerald-300"
                          }`}
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                    </div>

                    {dayBadges.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {dayBadges.map((badge) => (
                          <span
                            key={badge}
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              badge === "Horario"
                                ? "bg-emerald-300/15 text-emerald-100"
                                : badge === "Vacaciones"
                                  ? "bg-amber-300/15 text-amber-100"
                                  : "bg-red-300/15 text-red-100"
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}

                    {dayAvailability && (
                      <div className="mb-3 rounded-xl border border-emerald-300/20 bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100">
                        {
                          dayAvailability.start_time.slice(0, 5)
                        }{" "}
                        -{" "}
                        {
                          dayAvailability.end_time.slice(0, 5)
                        }
                        {dayAvailability.break_start_time &&
                          dayAvailability.break_end_time && (
                            <div className="mt-1 text-[11px] text-emerald-100/70">
                              Descanso{" "}
                              {dayAvailability.break_start_time.slice(0, 5)} -{" "}
                              {dayAvailability.break_end_time.slice(0, 5)}
                            </div>
                          )}
                      </div>
                    )}

                    {!dayAvailability &&
                      selectedSpecialist && (
                        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40">
                          Sin horario
                        </div>
                      )}

                    {blocked && (
                      <div className="mb-3 rounded-xl border border-red-300/20 bg-red-500/20 px-3 py-2 text-xs text-red-100">
                        Día bloqueado
                      </div>
                    )}

                    {vacation && (
                      <div className="mb-3 rounded-xl border border-amber-300/20 bg-amber-400/20 px-3 py-2 text-xs text-amber-100">
                        Vacaciones
                      </div>
                    )}

                    {dayTimeBlocks.map(
                      (slot) => (
                        <div
                          key={
                            slot.id
                          }
                          className="mb-2 rounded-xl border border-red-300/20 bg-red-500/20 px-3 py-2 text-xs text-red-100"
                        >
                          {
                            slot.start_time
                          }{" "}
                          -{" "}
                          {
                            slot.end_time
                          }
                        </div>
                      )
                    )}

                    {dayBookings.map(
                      (booking) => {
                        const statusClasses =
                          getStatusClasses(
                            booking.status
                          );

                        return (
                        <button
                          key={
                            booking.id
                          }
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed =
                              "move";
                            event.dataTransfer.setData(
                              "text/plain",
                              String(booking.id)
                            );
                            setDraggedBooking(
                              booking
                            );
                          }}
                          onDragEnd={() => {
                            setDraggedBooking(
                              null
                            );
                            setDragOverDate("");
                          }}
                          onClick={() => {
                            setSelectedBooking(
                              booking
                            );

                            setRescheduleDate(
                              booking.booking_date?.slice(
                                0,
                                10
                              ) || ""
                            );

                            setRescheduleTime(
                              getBookingTime(
                                booking
                              )
                            );

                            setRescheduleStatus(
                              booking.status ||
                                "Pendiente"
                            );
                          }}
                          className={`mb-2 w-full cursor-grab rounded-xl border px-3 py-2 text-left text-xs shadow-sm transition hover:scale-[1.02] active:cursor-grabbing ${
                            draggedBooking?.id ===
                            booking.id
                              ? "opacity-60"
                              : ""
                          } ${statusClasses.card}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-semibold">
                              <span
                                className={`h-2 w-2 rounded-full ${statusClasses.dot}`}
                              />
                              {
                                getBookingTime(
                                  booking
                                )
                              }
                            </div>

                            <span
                              className={`rounded-full px-2 py-1 text-[10px] ${statusClasses.pill}`}
                            >
                              {
                                booking.status ||
                                "Pendiente"
                              }
                            </span>
                          </div>

                          <div className="mt-2 truncate text-neutral-600">
                            {
                              booking.full_name
                            }
                          </div>
                          {booking.rescheduled_by === "patient" && (
                            <div className="mt-2 rounded-full bg-sky-600 px-2 py-1 text-[10px] text-white">
                              Cambio del paciente
                            </div>
                          )}
                        </button>
                        );
                      }
                    )}
                  </div>
                );
              }
            )}
          </div>
            </>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[88px_repeat(7,minmax(120px,1fr))] border-b border-white/10 bg-white/5">
                  <div className="p-3 text-xs uppercase tracking-[0.2em] text-white/40">
                    Hora
                  </div>

                  {weekDays.map((day) => {
                    const dayAvailability =
                      availability.find(
                        (item) =>
                          Number(
                            item.day_of_week ??
                              item.weekday
                          ) ===
                            day.weekday &&
                          (item.is_active ??
                            item.active ??
                            true)
                      );

                    const fullDayBlocked =
                      blockedDates.some(
                        (blockedDay) =>
                          blockedDay.blocked_date ===
                          day.value
                      );

                    const vacation =
                      vacations.find(
                        (vacationItem) =>
                          isDateInRange(
                            day.value,
                            vacationItem.start_date,
                            vacationItem.end_date
                          )
                      );

                    const dayBookings =
                      bookings.filter(
                        (booking) =>
                          booking.booking_date?.slice(
                            0,
                            10
                          ) === day.value
                      );

                    const dailyLimit = Number(
                      dayAvailability?.max_daily_bookings ||
                        0
                    );

                    const dayIsFull =
                      dailyLimit > 0 &&
                      dayBookings.length >= dailyLimit;

                    return (
                      <div
                        key={day.value}
                        className={`border-l border-white/10 p-3 ${
                          dayIsFull
                            ? "bg-sky-400/10"
                            : ""
                        }`}
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                          {day.date.toLocaleDateString(
                            "es-ES",
                            {
                              weekday: "short",
                            }
                          )}
                        </div>

                        <div className="mt-1 text-lg font-semibold">
                          {day.date.getDate()}
                        </div>

                        <div className="mt-2 text-[11px] text-white/45">
                          {fullDayBlocked
                            ? "Día bloqueado"
                            : vacation
                              ? "Vacaciones"
                              : dayAvailability
                                ? `${dayAvailability.start_time.slice(0, 5)} - ${dayAvailability.end_time.slice(0, 5)}`
                                : "Sin horario"}
                        </div>

                        {dayAvailability?.break_start_time &&
                          dayAvailability.break_end_time && (
                            <div className="mt-1 text-[11px] text-amber-200/80">
                              Descanso{" "}
                              {dayAvailability.break_start_time.slice(
                                0,
                                5
                              )}{" "}
                              -{" "}
                              {dayAvailability.break_end_time.slice(
                                0,
                                5
                              )}
                            </div>
                          )}

                        <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                          {dailyLimit > 0
                            ? `${dayBookings.length}/${dailyLimit}`
                            : `${dayBookings.length} reservas`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {timeSlots.map((slot) => (
                  <div
                    key={slot}
                    className="grid min-h-[86px] grid-cols-[88px_repeat(7,minmax(120px,1fr))] border-b border-white/10 last:border-b-0"
                  >
                    <div className="p-3 text-sm text-white/45">
                      {slot}
                    </div>

                    {weekDays.map((day) => {
                      const dropKey = `${day.value}-${slot}`;
                      const slotBookings = bookings.filter(
                        (booking) =>
                          booking.booking_date?.slice(
                            0,
                            10
                          ) === day.value &&
                          getBookingTime(booking) ===
                            slot
                      );

                      const dayBookings =
                        bookings.filter(
                          (booking) =>
                            booking.booking_date?.slice(
                              0,
                              10
                            ) === day.value
                        );

                      const dayAvailability =
                        availability.find(
                          (item) =>
                            Number(
                              item.day_of_week ??
                                item.weekday
                            ) ===
                              day.weekday &&
                            (item.is_active ??
                              item.active ??
                              true)
                        );

                      const insideAvailability =
                        dayAvailability &&
                        timeToMinutes(slot) >=
                          timeToMinutes(
                            dayAvailability.start_time
                          ) &&
                        timeToMinutes(slot) <
                          timeToMinutes(
                            dayAvailability.end_time
                          );

                      const slotEnd =
                        getSlotEnd(slot);

                      const inBreak =
                        dayAvailability &&
                        timeRangesOverlap(
                          slot,
                          slotEnd,
                          dayAvailability.break_start_time,
                          dayAvailability.break_end_time
                        );

                      const dailyLimit = Number(
                        dayAvailability?.max_daily_bookings ||
                          0
                      );

                      const dayIsFull =
                        dailyLimit > 0 &&
                        dayBookings.length >= dailyLimit;

                      const fullDayBlocked =
                        blockedDates.some(
                          (blockedDay) =>
                            blockedDay.blocked_date ===
                            day.value
                        );

                      const vacation =
                        vacations.find(
                          (vacationItem) =>
                            isDateInRange(
                              day.value,
                              vacationItem.start_date,
                              vacationItem.end_date
                            )
                        );

                      const blockedInSlot =
                        isTimeBlocked(
                          slot,
                          blockedTimeSlots.filter(
                            (block) =>
                              block.blocked_date ===
                              day.value
                          )
                        );

                      const slotUnavailable =
                        fullDayBlocked ||
                        Boolean(vacation) ||
                        blockedInSlot ||
                        Boolean(inBreak) ||
                        (dayIsFull &&
                          slotBookings.length === 0) ||
                        !insideAvailability;

                      const isDropTarget =
                        dragOverDate === dropKey;

                      return (
                        <div
                          key={dropKey}
                          onDragOver={(event) => {
                            if (
                              draggedBooking &&
                              !slotUnavailable
                            ) {
                              event.preventDefault();
                            }
                          }}
                          onDragEnter={() => {
                            if (
                              draggedBooking &&
                              !slotUnavailable
                            ) {
                              setDragOverDate(
                                dropKey
                              );
                            }
                          }}
                          onDragLeave={(event) => {
                            if (
                              event.currentTarget ===
                              event.target
                            ) {
                              setDragOverDate("");
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (slotUnavailable) {
                              setDragOverDate("");
                              return;
                            }
                            handleDropBooking(
                              day.value,
                              slot
                            );
                          }}
                          onClick={() => {
                            if (
                              !slotUnavailable &&
                              slotBookings.length ===
                                0 &&
                              !draggedBooking
                            ) {
                              openManualBooking(
                                day.value,
                                slot
                              );
                            }
                          }}
                          className={`group relative border-l border-white/10 p-2 transition ${
                            fullDayBlocked
                              ? "bg-red-500/10"
                              : vacation
                                ? "bg-amber-400/10"
                                : blockedInSlot
                                  ? "bg-red-500/10"
                                  : inBreak
                                    ? "bg-amber-400/10"
                                    : dayIsFull
                                      ? "bg-sky-400/10"
                                    : insideAvailability
                                      ? "bg-emerald-400/[0.055]"
                                      : "bg-white/[0.012]"
                          } ${
                            isDropTarget
                              ? "ring-2 ring-inset ring-white/70"
                              : ""
                          }`}
                        >
                          {slotBookings.length ===
                            0 &&
                            slotUnavailable && (
                              <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border border-white/5 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">
                                {fullDayBlocked
                                  ? "Bloqueado"
                                  : vacation
                                    ? "Vacaciones"
                                    : blockedInSlot
                                      ? "Bloqueado"
                                      : inBreak
                                        ? "Descanso"
                                        : dayIsFull
                                          ? "Completo"
                                          : "Fuera"}
                              </div>
                            )}

                          {slotBookings.length ===
                            0 &&
                            !slotUnavailable && (
                              <div className="pointer-events-none flex h-full min-h-[58px] items-center justify-center rounded-xl border border-dashed border-white/10 text-[10px] uppercase tracking-[0.18em] text-white/20 opacity-0 transition group-hover:opacity-100">
                                Nueva
                              </div>
                            )}

                          {slotBookings.map(
                            (booking) => {
                              const statusClasses =
                                getStatusClasses(
                                  booking.status
                                );

                              return (
                                <button
                                  key={booking.id}
                                  type="button"
                                  draggable
                                  onDragStart={(
                                    event
                                  ) => {
                                    event.dataTransfer.effectAllowed =
                                      "move";
                                    event.dataTransfer.setData(
                                      "text/plain",
                                      String(
                                        booking.id
                                      )
                                    );
                                    setDraggedBooking(
                                      booking
                                    );
                                  }}
                                  onDragEnd={() => {
                                    setDraggedBooking(
                                      null
                                    );
                                    setDragOverDate("");
                                  }}
                                  onClick={() => {
                                    setSelectedBooking(
                                      booking
                                    );
                                    setRescheduleDate(
                                      booking.booking_date?.slice(
                                        0,
                                        10
                                      ) || ""
                                    );
                                    setRescheduleTime(
                                      getBookingTime(
                                        booking
                                      )
                                    );
                                    setRescheduleStatus(
                                      booking.status ||
                                        "Pendiente"
                                    );
                                  }}
                                  className={`mb-2 w-full cursor-grab rounded-xl border px-3 py-2 text-left text-xs shadow-sm transition hover:scale-[1.02] active:cursor-grabbing ${statusClasses.card}`}
                                >
                                  <div className="flex items-center gap-2 font-semibold">
                                    <span
                                      className={`h-2 w-2 rounded-full ${statusClasses.dot}`}
                                    />
                                    {getBookingTime(
                                      booking
                                    )}
                                  </div>

                                  <div className="mt-1 truncate text-neutral-600">
                                    {
                                      booking.full_name
                                    }
                                  </div>
                                  {booking.rescheduled_by === "patient" && (
                                    <div className="mt-2 text-[10px] font-medium text-sky-700">
                                      Reprogramada por paciente
                                    </div>
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Bloquear día
            </p>

            <div className="mt-6 space-y-3">
              <input
                type="date"
                value={blockedDate}
                onChange={(e) =>
                  setBlockedDate(
                    e.target.value
                  )
                }
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              />

              <button
                onClick={
                  handleBlockDate
                }
                disabled={loading}
                className="w-full rounded-2xl bg-black px-5 py-4 text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? "Bloqueando..."
                  : "+ Bloquear día"}
              </button>

              {blockedDates.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-red-500">
                    Días bloqueados
                  </p>

                  {Array.from(
                    new Set(
                      blockedDates.map(
                        (item) =>
                          item.blocked_date
                      )
                    )
                  )
                    .sort()
                    .map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                      >
                        <span>{date}</span>

                        <button
                          type="button"
                          onClick={() =>
                            handleUnblockDate(
                              date
                            )
                          }
                          disabled={
                            unblockLoading ===
                            date
                          }
                          className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                        >
                          {unblockLoading ===
                          date
                            ? "Quitando..."
                            : "Desbloquear"}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Bloquear horario
            </p>

            <div className="mt-6 space-y-3">
              <input
                type="date"
                value={timeBlockDate}
                onChange={(e) =>
                  setTimeBlockDate(
                    e.target.value
                  )
                }
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={
                    timeBlockStart
                  }
                  onChange={(e) =>
                    setTimeBlockStart(
                      e.target.value
                    )
                  }
                  className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
                />

                <input
                  type="time"
                  value={
                    timeBlockEnd
                  }
                  onChange={(e) =>
                    setTimeBlockEnd(
                      e.target.value
                    )
                  }
                  className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
                />
              </div>

              <input
                type="text"
                value={
                  timeBlockReason
                }
                onChange={(e) =>
                  setTimeBlockReason(
                    e.target.value
                  )
                }
                placeholder="Motivo opcional"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              />

              <button
                onClick={
                  handleBlockTimeSlot
                }
                disabled={
                  timeBlockLoading
                }
                className="w-full rounded-2xl bg-black px-5 py-4 text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {timeBlockLoading
                  ? "Bloqueando..."
                  : "+ Bloquear horario"}
              </button>

              {blockedTimeSlots.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-red-500">
                    Horarios bloqueados
                  </p>

                  {blockedTimeSlots
                    .slice()
                    .sort((a, b) =>
                      `${a.blocked_date} ${a.start_time}`.localeCompare(
                        `${b.blocked_date} ${b.start_time}`
                      )
                    )
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-xl bg-white px-3 py-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">
                              {slot.blocked_date}
                            </div>
                            <div className="mt-1 text-neutral-500">
                              {slot.start_time.slice(0, 5)} -{" "}
                              {slot.end_time.slice(0, 5)}
                            </div>
                            {slot.reason && (
                              <div className="mt-1 text-xs text-neutral-400">
                                {slot.reason}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleUnblockTimeSlot(slot.id)
                            }
                            disabled={
                              unblockTimeLoading === String(slot.id)
                            }
                            className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                          >
                            {unblockTimeLoading === String(slot.id)
                              ? "Quitando..."
                              : "Quitar"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Vacaciones
            </p>

            <div className="mt-6 space-y-3">
              <input
                type="date"
                value={
                  vacationStart
                }
                onChange={(e) =>
                  setVacationStart(
                    e.target.value
                  )
                }
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              />

              <input
                type="date"
                value={vacationEnd}
                onChange={(e) =>
                  setVacationEnd(
                    e.target.value
                  )
                }
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              />

              <input
                type="text"
                value={
                  vacationReason
                }
                onChange={(e) =>
                  setVacationReason(
                    e.target.value
                  )
                }
                placeholder="Motivo opcional"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              />

              <button
                onClick={
                  handleSetVacation
                }
                disabled={
                  vacationLoading
                }
                className="w-full rounded-2xl bg-black px-5 py-4 text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {vacationLoading
                  ? "Guardando..."
                  : "+ Añadir vacaciones"}
              </button>

              {vacations.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-600">
                    Vacaciones registradas
                  </p>

                  {vacations
                    .slice()
                    .sort((a, b) =>
                      a.start_date.localeCompare(b.start_date)
                    )
                    .map((vacation) => (
                      <div
                        key={vacation.id}
                        className="rounded-xl bg-white px-3 py-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">
                              {vacation.start_date} - {vacation.end_date}
                            </div>
                            {vacation.reason && (
                              <div className="mt-1 text-xs text-neutral-400">
                                {vacation.reason}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteVacation(vacation.id)
                            }
                            disabled={
                              deleteVacationLoading ===
                              String(vacation.id)
                            }
                            className="rounded-full border border-amber-200 px-3 py-1 text-xs text-amber-700 transition hover:bg-amber-500 hover:text-black disabled:opacity-50"
                          >
                            {deleteVacationLoading === String(vacation.id)
                              ? "Quitando..."
                              : "Quitar"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Horario del doctor
            </p>

            <div className="mt-6 space-y-3">
              <select
                value={
                  availabilityDay
                }
                onChange={(e) =>
                  setAvailabilityDay(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
              >
                {weekdays.map(
                  (day) => (
                    <option
                      key={
                        day.value
                      }
                      value={
                        day.value
                      }
                    >
                      {day.label}
                    </option>
                  )
                )}
              </select>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Dia",
                    value: "single",
                  },
                  {
                    label: "L-V",
                    value: "weekdays",
                  },
                  {
                    label: "Semana",
                    value: "all",
                  },
                ].map((scope) => {
                  const active =
                    availabilityScope ===
                    scope.value;

                  return (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() =>
                        setAvailabilityScope(
                          scope.value as AvailabilityScope
                        )
                      }
                      className={`h-11 rounded-2xl border text-sm transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black hover:border-black"
                      }`}
                    >
                      {scope.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAvailabilityScope("weekdays");
                    handleSetAvailability("weekdays");
                  }}
                  disabled={availabilityLoading || !selectedSpecialist}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm transition hover:border-black disabled:opacity-50"
                >
                  Aplicar este horario de lunes a viernes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvailabilityScope("all");
                    handleSetAvailability("all");
                  }}
                  disabled={availabilityLoading || !selectedSpecialist}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm transition hover:border-black disabled:opacity-50"
                >
                  Copiar este horario a toda la semana
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={
                    availabilityStart
                  }
                  onChange={(e) =>
                    setAvailabilityStart(
                      e.target.value
                    )
                  }
                  className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
                />

                <input
                  type="time"
                  value={
                    availabilityEnd
                  }
                  onChange={(e) =>
                    setAvailabilityEnd(
                      e.target.value
                    )
                  }
                  className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    Descanso inicio
                  </p>

                  <input
                    type="time"
                    value={
                      availabilityBreakStart
                    }
                    onChange={(e) =>
                      setAvailabilityBreakStart(
                        e.target.value
                      )
                    }
                    className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    Descanso fin
                  </p>

                  <input
                    type="time"
                    value={
                      availabilityBreakEnd
                    }
                    onChange={(e) =>
                      setAvailabilityBreakEnd(
                        e.target.value
                      )
                    }
                    className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    Limite diario
                  </p>

                  <input
                    type="number"
                    min={0}
                    value={
                      availabilityMaxDaily
                    }
                    onChange={(e) =>
                      setAvailabilityMaxDaily(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    Intervalo slots
                  </p>

                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={
                      availabilitySlotInterval
                    }
                    onChange={(e) =>
                      setAvailabilitySlotInterval(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm">
                <input
                  type="checkbox"
                  checked={
                    availabilityActive
                  }
                  onChange={(e) =>
                    setAvailabilityActive(
                      e.target.checked
                    )
                  }
                />
                Día activo para
                reservas
              </label>

              <button
                onClick={() =>
                  handleSetAvailability()
                }
                disabled={
                  availabilityLoading
                }
                className="w-full rounded-2xl bg-black px-5 py-4 text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {availabilityLoading
                  ? "Guardando..."
                  : "Guardar horario"}
              </button>

              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Semana editable
                </p>

                <div className="mt-3 space-y-2">
                  {weekdays.map((day) => {
                    const dayAvailability =
                      availability.find(
                        (item) =>
                          getAvailabilityWeekday(item) ===
                          day.value
                      );
                    const active =
                      dayAvailability &&
                      isAvailabilityActive(
                        dayAvailability
                      );

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setAvailabilityDay(
                            day.value
                          );
                          setAvailabilityScope(
                            "single"
                          );
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#F8F5F1] px-3 py-3 text-left text-sm transition hover:bg-black hover:text-white"
                      >
                        <span className="font-medium">
                          {day.label}
                        </span>

                        <span className="text-xs opacity-70">
                          {dayAvailability
                            ? `${dayAvailability.start_time.slice(
                                0,
                                5
                              )} - ${dayAvailability.end_time.slice(
                                0,
                                5
                              )}`
                            : "Sin horario"}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] ${
                            active
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-neutral-400"
                          }`}
                        >
                          {active
                            ? "Activo"
                            : "Editar"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] bg-white/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Estado
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span>
                  Reservas
                </span>

                <span className="rounded-full bg-black px-3 py-1 text-sm text-white">
                  {
                    bookings.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>
                  Bloqueos día
                </span>

                <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                  {
                    blockedDates.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>
                  Bloqueos hora
                </span>

                <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                  {
                    blockedTimeSlots.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>
                  Vacaciones
                </span>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
                  {
                    vacations.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>
                  Horarios
                </span>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  {
                    availability.length
                  }
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {manualBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                  Nueva reserva
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  Crear reserva manual
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setManualBookingOpen(false)
                }
                className="rounded-full border border-black/10 px-4 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>

            <form
              onSubmit={handleCreateManualBooking}
              className="mt-6 grid gap-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  required
                  placeholder="Nombre del paciente"
                  value={manualBookingForm.full_name}
                  onChange={(event) =>
                    setManualBookingForm({
                      ...manualBookingForm,
                      full_name:
                        event.target.value,
                    })
                  }
                  className="h-14 rounded-2xl border border-black/10 px-4 outline-none"
                />

                <input
                  type="email"
                  placeholder="Email opcional"
                  value={manualBookingForm.email}
                  onChange={(event) =>
                    setManualBookingForm({
                      ...manualBookingForm,
                      email:
                        event.target.value,
                    })
                  }
                  className="h-14 rounded-2xl border border-black/10 px-4 outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <select
                  required
                  value={manualBookingForm.clinic_name}
                  onChange={(event) =>
                    setManualBookingForm({
                      ...manualBookingForm,
                      clinic_name:
                        event.target.value,
                      specialist_name: "",
                    })
                  }
                  className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
                >
                  <option value="">
                    Seleccionar clínica
                  </option>

                  {clinics.map((clinic) => (
                    <option
                      key={clinic.id}
                      value={clinic.name}
                    >
                      {clinic.name}
                    </option>
                  ))}
                </select>

                <select
                  required
                  value={
                    manualBookingForm.specialist_name
                  }
                  onChange={(event) =>
                    setManualBookingForm({
                      ...manualBookingForm,
                      specialist_name:
                        event.target.value,
                    })
                  }
                  className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
                >
                  <option value="">
                    Seleccionar especialista
                  </option>

                  {specialists
                    .filter(
                      (specialist) =>
                        !manualBookingForm.clinic_name ||
                        specialist.clinic_name ===
                          manualBookingForm.clinic_name
                    )
                    .map((specialist) => (
                      <option
                        key={specialist.id}
                        value={specialist.name}
                      >
                        {specialist.name}
                      </option>
                    ))}
                </select>
              </div>

              <select
                required
                value={manualBookingForm.treatment}
                onChange={(event) =>
                  setManualBookingForm({
                    ...manualBookingForm,
                    treatment:
                      event.target.value,
                  })
                }
                className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
              >
                <option value="">
                  Seleccionar tratamiento
                </option>

                {treatments.map((treatment) => (
                  <option
                    key={treatment.id}
                    value={treatment.name}
                  >
                    {treatment.name}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  required
                  type="date"
                  value={manualBookingForm.booking_date}
                  onChange={(event) =>
                    setManualBookingForm({
                      ...manualBookingForm,
                      booking_date:
                        event.target.value,
                    })
                  }
                  className="h-14 rounded-2xl border border-black/10 px-4 outline-none"
                />

                <input
                  required
                  type="time"
                  value={manualBookingForm.booking_time}
                  onChange={(event) =>
                    setManualBookingForm({
                      ...manualBookingForm,
                      booking_time:
                        event.target.value,
                    })
                  }
                  className="h-14 rounded-2xl border border-black/10 px-4 outline-none"
                />
              </div>

              <div className="rounded-2xl bg-[#F6F3EE] p-5 text-sm text-neutral-600">
                Se creará como reserva confirmada. La franja seleccionada ya fue marcada como disponible en la agenda.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setManualBookingOpen(false)
                  }
                  className="h-14 rounded-2xl border border-black/10"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={manualBookingLoading}
                  className="h-14 rounded-2xl bg-black text-white disabled:opacity-50"
                >
                  {manualBookingLoading
                    ? "Creando..."
                    : "Crear reserva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[32px] bg-white p-8">
            <h2 className="text-3xl font-semibold">
              Editar reserva
            </h2>

            <Link
              href={`/admin/reservas/${selectedBooking.id}`}
              className="mt-5 inline-flex rounded-full border border-black/10 px-5 py-2.5 text-sm transition hover:border-black"
            >
              Abrir ficha completa
            </Link>

            {selectedBooking.rescheduled_at && (
              <div className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">
                <div className="font-medium">
                  Reprogramada por{" "}
                  {selectedBooking.rescheduled_by === "patient"
                    ? "el paciente"
                    : "administracion"}
                </div>
                {selectedBooking.previous_booking_date && (
                  <div className="mt-1">
                    Horario anterior: {selectedBooking.previous_booking_date.slice(0, 10)}
                    {selectedBooking.previous_booking_time
                      ? ` - ${selectedBooking.previous_booking_time.slice(0, 5)}`
                      : ""}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <BookingTimeline bookingId={selectedBooking.id} />
            </div>

            <div className="mt-6 grid gap-4">
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) =>
                  {
                    setRescheduleDate(
                      e.target.value
                    );
                    setRescheduleTime("");
                  }
                }
                className="h-14 rounded-2xl border border-black/10 px-4 outline-none"
              />

              <select
                value={rescheduleTime}
                onChange={(e) =>
                  setRescheduleTime(
                    e.target.value
                  )
                }
                className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
              >
                <option value="">
                  Seleccionar hora disponible
                </option>

                {rescheduleSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>

              {rescheduleDate ? (
                <div
                  className={`rounded-2xl p-4 text-sm ${
                    rescheduleSlots.length > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {rescheduleSlotsLoading
                    ? "Consultando disponibilidad..."
                    : rescheduleSlots.length > 0
                      ? `${rescheduleSlots.length} huecos disponibles para ese dia.`
                      : rescheduleSlotReason ||
                        "No hay huecos disponibles para ese dia."}
                </div>
              ) : null}

              <select
                value={rescheduleStatus}
                onChange={(e) =>
                  setRescheduleStatus(
                    e.target.value
                  )
                }
                className="h-14 rounded-2xl border border-black/10 bg-white px-4 outline-none"
              >
                <option value="Pendiente">
                  Pendiente
                </option>

                <option value="Confirmada">
                  Confirmada
                </option>

                <option value="Cancelada">
                  Cancelada
                </option>

                <option value="Reprogramada">
                  Reprogramada
                </option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedBooking(
                      null
                    )
                  }
                  className="h-14 rounded-2xl border border-black/10"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    handleUpdateBooking
                  }
                  disabled={
                    updateLoading ||
                    rescheduleSlotsLoading ||
                    (rescheduleStatus !==
                      "Cancelada" &&
                      Boolean(
                        rescheduleDate
                      ) &&
                      !rescheduleTime)
                  }
                  className="h-14 rounded-2xl bg-black text-white disabled:opacity-50"
                >
                  {updateLoading
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
