import {
  type AdminPermission,
  hasAdminPermission,
  hasAnyAdminPermission,
  isSpecialistAccessRole,
} from "@/lib/admin-access";

export type AdminNavContext = {
  isSuperAdmin: boolean;
  accessRole?: string | null;
  permissions?: string[] | null;
  status?: string | null;
};

export type AdminNavItem = {
  name: string;
  href: string;
  visible: boolean;
};

export function getAdminAccessContext({
  isSuperAdmin,
  accessRole,
  permissions,
  status,
}: AdminNavContext) {
  return {
    role: isSuperAdmin ? "super_admin" : "staff",
    accessRole,
    permissions:
      permissions === undefined && !isSuperAdmin
        ? ["bookings", "calendar", "patients", "reviews", "analytics"]
        : permissions,
    status,
  };
}

export function getAdminNavItems(context: AdminNavContext) {
  const { isSuperAdmin, accessRole } = context;
  const adminAccess = getAdminAccessContext(context);
  const can = (permission: AdminPermission) =>
    hasAdminPermission(adminAccess, permission);
  const canAny = (items: AdminPermission[]) =>
    hasAnyAdminPermission(adminAccess, items);
  const canManageGlobalContent =
    isSuperAdmin || accessRole === "content_editor";
  const isSpecialistAccess =
    !isSuperAdmin && isSpecialistAccessRole(accessRole);
  const isClinicAccess =
    !isSuperAdmin &&
    ["clinic_owner", "clinic_manager", "reception"].includes(accessRole || "");

  return [
    {
      name: "Dashboard",
      href: "/admin",
      visible: isSuperAdmin,
    },
    {
      name: "Equipo",
      href: "/admin/admins",
      visible: isSuperAdmin,
    },
    {
      name: isClinicAccess ? "Mi clinica" : "Clinicas",
      href: "/admin/clinicas",
      visible:
        isSuperAdmin ||
        canManageGlobalContent ||
        (isClinicAccess && canAny(["content", "bookings", "calendar"])),
    },
    {
      name: "Reservas",
      href: "/admin/reservas",
      visible: !isSpecialistAccess && can("bookings"),
    },
    {
      name: isSpecialistAccess ? "Mi agenda" : "Agenda",
      href: "/admin/calendar",
      visible: can("calendar"),
    },
    {
      name: "Tratamientos",
      href: "/admin/tratamientos",
      visible: canManageGlobalContent,
    },
    {
      name: "Especialistas",
      href: "/admin/especialistas",
      visible:
        canManageGlobalContent ||
        (isClinicAccess &&
          ["clinic_owner", "clinic_manager"].includes(accessRole || "")),
    },
    {
      name: "Pacientes",
      href: "/admin/pacientes",
      visible: !isSpecialistAccess && can("patients"),
    },
    {
      name: "Opiniones",
      href: "/admin/reviews",
      visible: !isSpecialistAccess && can("reviews"),
    },
    {
      name: "Metricas",
      href: "/admin/analytics",
      visible: !isSpecialistAccess && can("analytics"),
    },
    {
      name: "Finanzas",
      href: "/admin/finanzas",
      visible: can("finance"),
    },
    {
      name: "Reporte",
      href: "/admin/reporte",
      visible: canAny(["analytics", "finance"]),
    },
    {
      name: "Plantillas",
      href: "/admin/emails",
      visible: isSuperAdmin,
    },
    {
      name: "Notificaciones",
      href: "/admin/notificaciones",
      visible: !isSpecialistAccess && (isSuperAdmin || can("bookings")),
    },
    {
      name: "Configuracion",
      href: "/admin/configuracion",
      visible: isSuperAdmin,
    },
  ].filter((item) => item.visible);
}
