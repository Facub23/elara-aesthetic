"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AdminToast from "@/components/AdminToast";
import {
  type AdminPermission,
  hasAdminPermission,
  hasAnyAdminPermission,
} from "@/lib/admin-access";

export default function AdminShell({
  children,
  isSuperAdmin,
  accessRole,
  permissions,
  status,
}: {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  accessRole?: string | null;
  permissions?: string[] | null;
  status?: string | null;
}) {
  const pathname = usePathname();
  const adminAccess = {
    role: isSuperAdmin ? "super_admin" : "staff",
    accessRole,
    permissions:
      permissions === undefined && !isSuperAdmin
        ? ["bookings", "calendar", "patients", "reviews", "analytics"]
        : permissions,
    status,
  };
  const can = (permission: AdminPermission) =>
    hasAdminPermission(adminAccess, permission);
  const canAny = (items: AdminPermission[]) =>
    hasAnyAdminPermission(adminAccess, items);
  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      visible: true,
    },
    {
      name: "Equipo",
      href: "/admin/admins",
      visible: isSuperAdmin,
    },
    {
      name: "Reservas",
      href: "/admin/reservas",
      visible: can("bookings"),
    },
    {
      name: "Agenda",
      href: "/admin/calendar",
      visible: can("calendar"),
    },
    {
      name: "Clinicas",
      href: "/admin/clinicas",
      visible: canAny(["content", "bookings", "calendar"]),
    },
    {
      name: "Tratamientos",
      href: "/admin/tratamientos",
      visible: isSuperAdmin || can("content"),
    },
    {
      name: "Especialistas",
      href: "/admin/especialistas",
      visible: isSuperAdmin || can("content") || accessRole === "clinic_manager",
    },
    {
      name: "Pacientes",
      href: "/admin/pacientes",
      visible: can("patients"),
    },
    {
      name: "Opiniones",
      href: "/admin/reviews",
      visible: can("reviews"),
    },
    {
      name: "Metricas",
      href: "/admin/analytics",
      visible: can("analytics"),
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
      visible: isSuperAdmin || can("bookings"),
    },
    {
      name: "Configuracion",
      href: "/admin/configuracion",
      visible: isSuperAdmin,
    },
  ].filter((item) => item.visible);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black print:min-h-0 print:bg-white">
      <AdminToast />

      <div className="flex print:block">
        <aside className="hidden min-h-screen w-[316px] shrink-0 border-r border-black/5 bg-white/70 p-8 backdrop-blur-2xl lg:block print:hidden">
          <div>
            <div className="text-[26px] font-semibold leading-none tracking-tight">
              EncuentraTuClinica
            </div>

            <div className="mt-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Admin Panel
            </div>

            <Link
              href="/api/logout"
              prefetch={false}
              className="mt-6 inline-flex rounded-full border border-black/10 px-5 py-2.5 text-xs transition hover:bg-black hover:text-white"
            >
              Salir
            </Link>
          </div>

          <nav className="mt-12 space-y-2">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-left text-sm transition-all duration-300 ${
                    active
                      ? "bg-black text-white shadow-[0_14px_35px_rgba(0,0,0,0.12)]"
                      : "bg-white hover:bg-black hover:text-white"
                  }`}
                >
                  <span>{item.name}</span>
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-16 rounded-[28px] bg-black p-6 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">
              Marketplace premium
            </div>

            <div className="mt-5 text-3xl font-semibold">Admin</div>

            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Panel interno seguro con roles, metricas y actividad en vivo.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 border-b border-black/5 bg-[#F6F3EE]/90 px-5 py-4 backdrop-blur-xl lg:hidden print:hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold sm:text-2xl">
                  EncuentraTuClinica
                </div>

                <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Admin
                </div>
              </div>

              <Link
                href="/api/logout"
                prefetch={false}
                className="shrink-0 rounded-full bg-black px-5 py-3 text-sm text-white"
              >
                Salir
              </Link>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {navItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap rounded-full px-5 py-3 text-sm ${
                      active ? "bg-black text-white" : "bg-white"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-5 lg:p-10 print:p-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
