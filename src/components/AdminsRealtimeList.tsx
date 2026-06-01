"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import AdminUserActions from "@/components/AdminUserActions";
import { getAccessRoleLabel, getPermissionLabel } from "@/lib/admin-access";

type AdminUser = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  access_role?: string | null;
  clinic_id?: number | null;
  permissions?: string[] | null;
  status?: string | null;
  created_at: string;
};

export default function AdminsRealtimeList({
  initialAdmins,
  currentAdminId,
}: {
  initialAdmins: AdminUser[];
  currentAdminId: string;
}) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("admins-realtime-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_users",
        },
        (payload) => {
          const newAdmin = payload.new as AdminUser;

          setAdmins((prev) => {
            const exists = prev.some((admin) => admin.id === newAdmin.id);

            if (exists) return prev;

            return [newAdmin, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_users",
        },
        (payload) => {
          const updatedAdmin = payload.new as AdminUser;

          setAdmins((prev) =>
            prev.map((admin) =>
              admin.id === updatedAdmin.id ? updatedAdmin : admin
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "admin_users",
        },
        (payload) => {
          const deletedAdmin = payload.old as AdminUser;

          setAdmins((prev) =>
            prev.filter((admin) => admin.id !== deletedAdmin.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  if (admins.length === 0) {
    return (
      <div className="rounded-[28px] bg-[#F7F5F2] p-8 text-center text-neutral-500">
        No hay administradores todavía.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {admins.map((admin) => (
        <div
          key={admin.id}
          className="flex flex-col gap-4 rounded-[28px] bg-[#F7F5F2] p-6 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <div className="text-xl font-semibold">{admin.email}</div>

            <div className="mt-2 text-sm text-neutral-500">
              User ID: {admin.user_id}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1 text-neutral-600">
                Sistema: {admin.role === "super_admin" ? "Superadmin" : "Staff"}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-neutral-600">
                Rango: {getAccessRoleLabel(admin.access_role)}
              </span>
              {admin.clinic_id ? (
                <span className="rounded-full bg-white px-3 py-1 text-neutral-600">
                  Clinica #{admin.clinic_id}
                </span>
              ) : null}
              {(admin.permissions || []).slice(0, 4).map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-white px-3 py-1 text-neutral-600"
                >
                  {getPermissionLabel(permission)}
                </span>
              ))}
            </div>
          </div>

          <AdminUserActions
            adminId={admin.id}
            currentRole={admin.role}
            currentAccessRole={admin.access_role || "clinic_manager"}
            currentPermissions={admin.permissions || []}
            currentClinicId={admin.clinic_id || null}
            isCurrentUser={String(admin.id) === currentAdminId}
          />
        </div>
      ))}
    </div>
  );
}
