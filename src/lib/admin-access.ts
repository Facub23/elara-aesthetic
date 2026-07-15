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
    label: "Especialista de clinica",
    description: "Su agenda dentro de una clinica asociada.",
  },
  {
    value: "independent_specialist",
    label: "Especialista independiente",
    description: "Su agenda y perfil profesional sin clinica asociada.",
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
export type AdminPermission = (typeof ADMIN_PERMISSION_OPTIONS)[number]["value"];

export type AdminAccessContext = {
  role?: string | null;
  accessRole?: string | null;
  permissions?: string[] | null;
  status?: string | null;
};

export function isAdminAccessRole(value: string): value is AdminAccessRole {
  return ADMIN_ACCESS_ROLES.some((role) => role.value === value);
}

export function isSpecialistAccessRole(value?: string | null) {
  return value === "specialist" || value === "independent_specialist";
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

const IMPLIED_ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  clinic_owner: [
    "bookings",
    "calendar",
    "patients",
    "content",
    "reviews",
    "finance",
    "analytics",
  ],
  clinic_manager: [
    "bookings",
    "calendar",
    "patients",
    "content",
    "reviews",
    "analytics",
  ],
  reception: ["bookings", "calendar", "patients"],
  specialist: ["bookings", "calendar", "patients"],
  independent_specialist: ["bookings", "calendar", "patients"],
  content_editor: ["content", "reviews", "analytics"],
  finance: ["finance", "analytics"],
};

export function hasAdminPermission(
  admin: AdminAccessContext | null | undefined,
  permission: AdminPermission
) {
  if (!admin || admin.status === "suspended") return false;
  if (admin.role === "super_admin") return true;

  const directPermissions = admin.permissions || [];

  if (directPermissions.includes(permission)) return true;

  const impliedPermissions =
    IMPLIED_ROLE_PERMISSIONS[admin.accessRole || ""] || [];

  return impliedPermissions.includes(permission);
}

export function hasAnyAdminPermission(
  admin: AdminAccessContext | null | undefined,
  permissions: AdminPermission[]
) {
  return permissions.some((permission) => hasAdminPermission(admin, permission));
}
