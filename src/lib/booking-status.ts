export type BookingStatusKey =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired"
  | "other";

export const adminBookingStatusOptions = [
  { value: "Pendiente", label: "Pendiente" },
  { value: "Pendiente confirmacion", label: "Pendiente confirmacion" },
  { value: "Confirmada", label: "Confirmada" },
  { value: "Reprogramada", label: "Reprogramada" },
  { value: "Cancelada", label: "Cancelada" },
  { value: "No asistio", label: "No asistio" },
] as const;

export const bookingFilterStatusOptions = [
  ...adminBookingStatusOptions,
  { value: "Completada", label: "Completada" },
  { value: "Expirada", label: "Expirada" },
] as const;

const canonicalByKey: Partial<Record<BookingStatusKey, string>> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rescheduled: "Reprogramada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistio",
  expired: "Expirada",
};

const legacyPendingConfirmation =
  "Pendiente confirmaci" + String.fromCharCode(195, 179) + "n";
const legacyNoShow = "No asisti" + String.fromCharCode(195, 179);

function repairLegacyStatusEncoding(status: string) {
  return status
    .replaceAll(legacyPendingConfirmation, "Pendiente confirmacion")
    .replaceAll(legacyNoShow, "No asistio");
}

export function normalizeBookingStatus(status?: string | null) {
  return repairLegacyStatusEncoding(status || "Pendiente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getBookingStatusKey(status?: string | null): BookingStatusKey {
  const normalized = normalizeBookingStatus(status);

  if (normalized.includes("confirmada")) return "confirmed";
  if (normalized.includes("reprogramada")) return "rescheduled";
  if (normalized.includes("completada")) return "completed";
  if (normalized.includes("cancelada")) return "cancelled";
  if (normalized.includes("asisti")) return "no_show";
  if (normalized.includes("expirada")) return "expired";
  if (normalized.includes("pendiente") || normalized.includes("confirmaci")) {
    return "pending";
  }

  return "other";
}

export function isPendingBookingStatus(status?: string | null) {
  return getBookingStatusKey(status) === "pending";
}

export function isIncidentBookingStatus(status?: string | null) {
  const key = getBookingStatusKey(status);
  return key === "cancelled" || key === "no_show" || key === "expired";
}

export function getCanonicalAdminBookingStatus(status?: unknown) {
  if (typeof status !== "string") return null;

  const normalized = normalizeBookingStatus(status);
  const accepted = [
    "pendiente",
    "pendiente confirmacion",
    "confirmada",
    "reprogramada",
    "cancelada",
    "no asistio",
  ];

  if (!accepted.includes(normalized)) return null;

  const key = getBookingStatusKey(status);

  if (key === "completed" || key === "expired" || key === "other") return null;
  if (key === "pending" && normalized.includes("confirmaci")) {
    return "Pendiente confirmacion";
  }

  return canonicalByKey[key] || null;
}

export function getBookingStatusLabel(status?: string | null) {
  const normalized = normalizeBookingStatus(status);
  const key = getBookingStatusKey(status);

  if (key === "pending" && normalized.includes("confirmaci")) {
    return "Pendiente confirmacion";
  }

  return canonicalByKey[key] || repairLegacyStatusEncoding(status || "Pendiente");
}

export function getBookingStatusClass(
  status?: string | null,
  withBorder = false
) {
  const border = withBorder ? " border" : "";

  switch (getBookingStatusKey(status)) {
    case "confirmed":
      return `bg-emerald-100 text-emerald-700${border} border-emerald-200`;
    case "completed":
      return `bg-black text-white${border} border-black`;
    case "rescheduled":
      return `bg-sky-100 text-sky-700${border} border-sky-200`;
    case "cancelled":
    case "no_show":
    case "expired":
      return `bg-red-100 text-red-700${border} border-red-200`;
    case "pending":
      return `bg-amber-100 text-amber-700${border} border-amber-200`;
    default:
      return `bg-white text-neutral-700${border} border-black/10`;
  }
}

export function getBookingStatusFilterValues(status: string) {
  switch (getBookingStatusKey(status)) {
    case "pending":
      return ["Pendiente", "Pendiente confirmacion", legacyPendingConfirmation];
    case "no_show":
      return ["No asistio", legacyNoShow];
    default:
      return [status];
  }
}
