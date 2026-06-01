import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export const blockingStatuses = [
  "Pendiente",
  "Pendiente confirmacion",
  "Pendiente confirmaci" + String.fromCharCode(195, 179) + "n",
  "Pendiente confirmaci" +
    String.fromCharCode(195, 131, 194, 179) +
    "n",
  "Pendiente confirmaci" +
    String.fromCharCode(195, 131, 198, 146, 195, 130, 194, 179) +
    "n",
  "Confirmada",
  "Reprogramada",
];

const defaultBufferMinutes = Number(
  process.env.ENCUENTRA_BOOKING_BUFFER_MINUTES || 15
);

const defaultMaxDailyBookings = Number(
  process.env.ENCUENTRA_MAX_DAILY_BOOKINGS || 0
);

type Booking = {
  id?: string | number | null;
  booking_date?: string | null;
  booking_time?: string | null;
  status?: string | null;
  duration_minutes?: number | string | null;
};

type Availability = {
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

type TimeRange = {
  start_time: string;
  end_time: string;
};

type WorkingRange = {
  start: string;
  end: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  maxDailyBookings?: number;
  slotIntervalMinutes?: number;
};

type SlotValidationInput = {
  bookingId?: string | number | null;
  specialistName: string;
  bookingDate: string;
  bookingTime: string;
  durationMinutes: number;
};

export type AvailableBookingSlotsResult = {
  availableSlots: string[];
  bookedSlots: string[];
  blockedSlots: string[];
  blocked: boolean;
  reason?: string;
  bufferMinutes: number;
  maxDailyBookings: number;
};

export function normalizeBookingDate(value: string) {
  return value.slice(0, 10);
}

export function getBookingTime(booking: Booking) {
  return (
    booking.booking_time ||
    booking.booking_date?.slice(11, 16) ||
    ""
  );
}

export async function getTreatmentDuration(
  treatment?: string | null
) {
  if (!treatment) return getDefaultAppointmentDuration();

  const { data } = await supabase
    .from("treatment_durations")
    .select("duration_minutes")
    .ilike("treatment_name", treatment)
    .maybeSingle();

  return Number(
    data?.duration_minutes ||
      (await getDefaultAppointmentDuration())
  );
}

async function getDefaultAppointmentDuration() {
  const { data } = await supabase
    .from("app_settings")
    .select("appointment_duration")
    .limit(1)
    .maybeSingle();

  return Number(data?.appointment_duration || 60);
}

function getWeekday(date: string) {
  return new Date(`${date}T00:00:00`).getDay();
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(
    2,
    "0"
  );
  const mins = String(minutes % 60).padStart(2, "0");

  return `${hours}:${mins}`;
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return startA < endB && endA > startB;
}

function generateSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
) {
  const slots: string[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current < end) {
    slots.push(minutesToTime(current));
    current += intervalMinutes;
  }

  return slots;
}

function isActiveAvailability(item: Availability) {
  if (item.is_active === false || item.active === false) {
    return false;
  }

  return item.is_active ?? item.active ?? true;
}

function getAvailabilityWeekday(item: Availability) {
  const value = item.day_of_week ?? item.weekday;

  if (typeof value === "number") return value;

  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const weekdaysByName: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
  };

  return weekdaysByName[normalized] ?? Number(value);
}

function mapWorkingRange(item: Availability): WorkingRange {
  return {
    start: item.start_time,
    end: item.end_time,
    breakStart: item.break_start_time,
    breakEnd: item.break_end_time,
    maxDailyBookings: Number(item.max_daily_bookings || 0),
    slotIntervalMinutes: Number(
      item.slot_interval_minutes || 30
    ),
  };
}

async function getWorkingRanges(
  specialistName: string,
  date: string
) {
  const weekday = getWeekday(date);

  const { data, error } = await supabase
    .from("specialist_availability")
    .select("*")
    .eq("specialist_name", specialistName);

  if (error) {
    return {
      ranges: [] as WorkingRange[],
      error: error.message,
    };
  }

  let availabilityRows = (data || []) as Availability[];

  if (availabilityRows.length === 0) {
    const { data: fallbackData, error: fallbackError } =
      await supabase
        .from("specialist_availability")
        .select("*")
        .ilike("specialist_name", specialistName.trim());

    if (fallbackError) {
      return {
        ranges: [] as WorkingRange[],
        error: fallbackError.message,
      };
    }

    availabilityRows = (fallbackData || []) as Availability[];
  }

  const ranges = availabilityRows
    .filter(
      (item) =>
        getAvailabilityWeekday(item) === weekday &&
        isActiveAvailability(item)
    )
    .map(mapWorkingRange);

  return {
    ranges,
    error: null,
  };
}

async function getDayBlockReason(
  specialistName: string,
  date: string
) {
  const { data: blockedDates, error: blockedError } =
    await supabase
      .from("blocked_dates")
      .select("id")
      .eq("specialist_name", specialistName)
      .eq("blocked_date", date);

  if (blockedError) return blockedError.message;

  if (blockedDates && blockedDates.length > 0) {
    return "El dia esta bloqueado para este especialista";
  }

  const { data: vacations, error: vacationError } =
    await supabase
      .from("specialist_vacations")
      .select("id")
      .eq("specialist_name", specialistName)
      .lte("start_date", date)
      .gte("end_date", date);

  if (vacationError) return vacationError.message;

  if (vacations && vacations.length > 0) {
    return "El especialista esta de vacaciones ese dia";
  }

  return null;
}

async function getBlockedTimes(
  specialistName: string,
  date: string
) {
  const { data, error } = await supabase
    .from("blocked_time_slots")
    .select("start_time, end_time")
    .eq("specialist_name", specialistName)
    .eq("blocked_date", date);

  return {
    ranges: (data || []) as TimeRange[],
    error: error?.message || null,
  };
}

async function getBlockingBookings(
  specialistName: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, booking_time, status, duration_minutes"
    )
    .eq("specialist_name", specialistName)
    .in("status", blockingStatuses);

  return {
    bookings: (data || []) as Booking[],
    error: error?.message || null,
  };
}

function getDailyBookingLimit(ranges: WorkingRange[]) {
  const rangeLimit = ranges.reduce((limit, range) => {
    if (!range.maxDailyBookings) return limit;
    if (!limit) return range.maxDailyBookings;
    return Math.min(limit, range.maxDailyBookings);
  }, 0);

  return rangeLimit || defaultMaxDailyBookings;
}

function isInsideWorkingRange(
  slotStart: number,
  slotEnd: number,
  range: WorkingRange
) {
  const rangeStart = timeToMinutes(range.start);
  const rangeEnd = timeToMinutes(range.end);

  if (slotStart < rangeStart || slotEnd > rangeEnd) {
    return false;
  }

  if (range.breakStart && range.breakEnd) {
    return !overlaps(
      slotStart,
      slotEnd,
      timeToMinutes(range.breakStart),
      timeToMinutes(range.breakEnd)
    );
  }

  return true;
}

export async function getAvailableBookingSlots({
  specialistName,
  bookingDate,
  durationMinutes,
  bookingId,
}: {
  specialistName: string;
  bookingDate: string;
  durationMinutes: number;
  bookingId?: string | number | null;
}): Promise<AvailableBookingSlotsResult> {
  const date = normalizeBookingDate(bookingDate);
  const blockedReason = await getDayBlockReason(
    specialistName,
    date
  );

  if (blockedReason) {
    return {
      availableSlots: [],
      bookedSlots: [],
      blockedSlots: [],
      blocked: true,
      reason: blockedReason,
      bufferMinutes: defaultBufferMinutes,
      maxDailyBookings: defaultMaxDailyBookings,
    };
  }

  const { ranges: workingRanges, error: availabilityError } =
    await getWorkingRanges(specialistName, date);

  if (availabilityError) {
    throw new Error(availabilityError);
  }

  if (workingRanges.length === 0) {
    return {
      availableSlots: [],
      bookedSlots: [],
      blockedSlots: [],
      blocked: true,
      reason:
        "El especialista no tiene horario activo ese dia",
      bufferMinutes: defaultBufferMinutes,
      maxDailyBookings: defaultMaxDailyBookings,
    };
  }

  const slotInterval = Math.max(
    5,
    Math.min(
      ...workingRanges.map(
        (range) => range.slotIntervalMinutes || 30
      )
    )
  );

  const baseSlots = Array.from(
    new Set(
      workingRanges.flatMap((range) =>
        generateSlots(
          range.start,
          range.end,
          slotInterval
        )
      )
    )
  ).sort();

  const { ranges: blockedTimes, error: blockedTimeError } =
    await getBlockedTimes(specialistName, date);

  if (blockedTimeError) {
    throw new Error(blockedTimeError);
  }

  const { bookings, error: bookingsError } =
    await getBlockingBookings(specialistName);

  if (bookingsError) {
    throw new Error(bookingsError);
  }

  const dayBookings = bookings.filter((booking) => {
    if (
      bookingId &&
      String(booking.id) === String(bookingId)
    ) {
      return false;
    }

    return (
      normalizeBookingDate(booking.booking_date || "") ===
      date
    );
  });

  const maxDailyBookings =
    getDailyBookingLimit(workingRanges);

  const bookedSlots = dayBookings
    .map((booking) => getBookingTime(booking))
    .filter(Boolean);

  const blockedSlots = baseSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd =
      slotStart + durationMinutes + defaultBufferMinutes;

    return blockedTimes.some((range) =>
      overlaps(
        slotStart,
        slotEnd,
        timeToMinutes(range.start_time),
        timeToMinutes(range.end_time)
      )
    );
  });

  const availableSlots = baseSlots.filter((slot) => {
    if (
      maxDailyBookings > 0 &&
      dayBookings.length >= maxDailyBookings
    ) {
      return false;
    }

    const slotStart = timeToMinutes(slot);
    const slotEnd =
      slotStart + durationMinutes + defaultBufferMinutes;

    const fitsInsideWorkingHours = workingRanges.some(
      (range) =>
        isInsideWorkingRange(slotStart, slotEnd, range)
    );

    if (!fitsInsideWorkingHours) return false;

    const conflictsWithBlockedTime = blockedTimes.some(
      (range) =>
        overlaps(
          slotStart,
          slotEnd,
          timeToMinutes(range.start_time),
          timeToMinutes(range.end_time)
        )
    );

    if (conflictsWithBlockedTime) return false;

    return !dayBookings.some((booking) => {
      const existingTime = getBookingTime(booking);
      if (!existingTime) return false;

      const existingStart = timeToMinutes(existingTime);
      const existingEnd =
        existingStart +
        Number(booking.duration_minutes || 60) +
        defaultBufferMinutes;

      return overlaps(
        slotStart,
        slotEnd,
        existingStart,
        existingEnd
      );
    });
  });

  return {
    availableSlots,
    bookedSlots,
    blockedSlots,
    blocked: false,
    bufferMinutes: defaultBufferMinutes,
    maxDailyBookings,
    reason:
      maxDailyBookings > 0 &&
      dayBookings.length >= maxDailyBookings
        ? "El especialista alcanzo el limite diario de reservas"
        : undefined,
  };
}

export async function validateBookingSlot({
  bookingId,
  specialistName,
  bookingDate,
  bookingTime,
  durationMinutes,
}: SlotValidationInput) {
  const date = normalizeBookingDate(bookingDate);
  const blockedReason = await getDayBlockReason(
    specialistName,
    date
  );

  if (blockedReason) return blockedReason;

  const { ranges: workingRanges, error: availabilityError } =
    await getWorkingRanges(specialistName, date);

  if (availabilityError) return availabilityError;

  if (workingRanges.length === 0) {
    return "El especialista no tiene horario activo ese dia";
  }

  const slotStart = timeToMinutes(bookingTime);
  const slotEnd =
    slotStart + durationMinutes + defaultBufferMinutes;

  const fitsInsideWorkingHours = workingRanges.some(
    (range) =>
      isInsideWorkingRange(slotStart, slotEnd, range)
  );

  if (!fitsInsideWorkingHours) {
    return "El horario queda fuera de la disponibilidad del especialista";
  }

  const { ranges: blockedTimes, error: blockedTimeError } =
    await getBlockedTimes(specialistName, date);

  if (blockedTimeError) return blockedTimeError;

  const conflictsWithBlockedTime = blockedTimes.some(
    (range) =>
      overlaps(
        slotStart,
        slotEnd,
        timeToMinutes(range.start_time),
        timeToMinutes(range.end_time)
      )
  );

  if (conflictsWithBlockedTime) {
    return "El horario seleccionado esta bloqueado";
  }

  const { bookings, error: bookingsError } =
    await getBlockingBookings(specialistName);

  if (bookingsError) return bookingsError;

  const dayBookings = bookings.filter((booking) => {
    if (
      bookingId &&
      String(booking.id) === String(bookingId)
    ) {
      return false;
    }

    return (
      normalizeBookingDate(booking.booking_date || "") ===
      date
    );
  });

  const maxDailyBookings =
    getDailyBookingLimit(workingRanges);

  if (
    maxDailyBookings > 0 &&
    dayBookings.length >= maxDailyBookings
  ) {
    return "El especialista alcanzo el limite diario de reservas";
  }

  const conflictsWithBooking = dayBookings.some(
    (booking) => {
      const existingTime = getBookingTime(booking);
      if (!existingTime) return false;

      const existingStart = timeToMinutes(existingTime);
      const existingEnd =
        existingStart +
        Number(booking.duration_minutes || 60) +
        defaultBufferMinutes;

      return overlaps(
        slotStart,
        slotEnd,
        existingStart,
        existingEnd
      );
    }
  );

  if (conflictsWithBooking) {
    return "Ya existe una reserva en ese horario";
  }

  return null;
}
