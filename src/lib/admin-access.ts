export const ADMIN_ACCESS_ROLES = [
  {
    value: "clinic_owner",
    label: "Propietario de clinica",
    description: "Vision completa de una clinica concreta.",
  },
  {
    value: "clinic_manager",
    label: "Manager de clinica",
    description: "Reservas, agenda, pacientes y equipo operativo.",
  },
  {
    value: "reception",
    label: "Recepcion",
    description: "Reservas, calendario y pacientes.",
  },
  {
    value: "specialist",
    label: "Especialista",
    description: "Su agenda, reservas y pacientes asignados.",
  },
  {
    value: "content_editor",
    label: "Editor de contenido",
    description: "Clinicas, tratamientos, especialistas y SEO.",
  },
  {
    value: "finance",
    label: "Finanzas",
    description: "Pagos, comisiones y reportes economicos.",
  },
] as const;

export const ADMIN_PERMISSION_OPTIONS = [
  { value: "bookings", label: "Reservas" },
  { value: "calendar", label: "Agenda" },
  { value: "patients", label: "Pacientes" },
  { value: "content", label: "Contenido" },
  { value: "reviews", label: "Opiniones" },
  { value: "finance", label: "Finanzas" },
  { value: "analytics", label: "Metricas" },
] as const;

export type AdminAccessRole = (typeof ADMIN_ACCESS_ROLES)[number]["value"];

export function isAdminAccessRole(value: string): value is AdminAccessRole {
  return ADMIN_ACCESS_ROLES.some((role) => role.value === value);
}

export function filterAdminPermissions(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const allowed = new Set<string>(
    ADMIN_PERMISSION_OPTIONS.map((item) => item.value)
  );

  return values
    .map((value) => String(value))
    .filter((value, index, array) => allowed.has(value) && array.indexOf(value) === index);
}

export function getAccessRoleLabel(value?: string | null) {
  return (
    ADMIN_ACCESS_ROLES.find((role) => role.value === value)?.label ||
    "Acceso operativo"
  );
}

export function getPermissionLabel(value: string) {
  return (
    ADMIN_PERMISSION_OPTIONS.find((permission) => permission.value === value)
      ?.label || value
  );
}
