import {
  ADMIN_ACCESS_ROLES,
  getAccessRoleLabel,
} from "@/lib/admin-access";
import { getAdminNavItems } from "@/lib/admin-navigation";

const ROLE_ORDER = [
  "super_admin",
  ...ADMIN_ACCESS_ROLES.map((role) => role.value),
];

function getRoleContext(role: string) {
  if (role === "super_admin") {
    return {
      isSuperAdmin: true,
      accessRole: "super_admin",
      permissions: [],
      status: "active",
    };
  }

  return {
    isSuperAdmin: false,
    accessRole: role,
    permissions: null,
    status: "active",
  };
}

function getRoleDescription(role: string) {
  if (role === "super_admin") {
    return "Control total del marketplace, equipo, configuracion y contenido.";
  }

  return (
    ADMIN_ACCESS_ROLES.find((item) => item.value === role)?.description ||
    "Acceso operativo limitado."
  );
}

export default function AdminRoleAccessMatrix() {
  const rows = ROLE_ORDER.map((role) => ({
    role,
    label: role === "super_admin" ? "Superadmin" : getAccessRoleLabel(role),
    description: getRoleDescription(role),
    items: getAdminNavItems(getRoleContext(role)),
  }));

  return (
    <section className="mt-12 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Matriz de accesos
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Que ve cada rol
          </h2>
        </div>

        <div className="rounded-full bg-[#F7F5F2] px-5 py-2.5 text-sm text-neutral-600">
          {rows.length} rangos
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5">
        <div className="grid grid-cols-[220px_1fr] bg-black px-5 py-4 text-xs uppercase tracking-[0.18em] text-white/60 max-md:hidden">
          <div>Rol</div>
          <div>Areas visibles</div>
        </div>

        <div className="divide-y divide-black/5">
          {rows.map((row) => (
            <div
              key={row.role}
              className="grid gap-4 bg-white/75 p-5 md:grid-cols-[220px_1fr]"
            >
              <div>
                <div className="text-base font-semibold">{row.label}</div>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {row.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {row.items.map((item) => (
                  <span
                    key={`${row.role}-${item.href}`}
                    className="rounded-full bg-[#F7F5F2] px-4 py-2 text-sm text-neutral-700"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
