"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  related_booking_id: string | number | null;
  read_at: string | null;
  created_at: string;
};

const legacyPendingConfirmation =
  "Pendiente confirmaci" + String.fromCharCode(195, 179) + "n";
const legacyConfirmation =
  "confirmaci" + String.fromCharCode(195, 179) + "n";

function cleanNotificationText(value?: string | null) {
  return (value || "")
    .replaceAll(legacyPendingConfirmation, "Pendiente confirmacion")
    .replaceAll(legacyConfirmation, "confirmacion")
    .replace(/ELARA/gi, "EncuentraTuClinica");
}

export default function AdminLiveNotifications({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState<
    Notification[]
  >(initialNotifications || []);

  const unreadCount = notifications.filter(
    (item) => !item.read_at
  ).length;

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("admin-notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          const notification =
            payload.new as Notification;

          setNotifications((prev) => [
            notification,
            ...prev,
          ].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          const notification =
            payload.new as Notification;

          setNotifications((prev) =>
            prev.map((item) =>
              item.id === notification.id
                ? notification
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  async function markAsRead(id: string) {
    const previousNotifications = notifications;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              read_at: new Date().toISOString(),
            }
          : item
      )
    );

    const response = await fetch("/api/mark-admin-notification-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
      }),
    });

    if (!response.ok) {
      setNotifications(previousNotifications);

      window.dispatchEvent(
        new CustomEvent("admin-toast", {
          detail: {
            message: "No se pudo marcar la notificacion como leida",
            type: "error",
          },
        })
      );
    }
  }

  return (
    <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Inbox
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Notificaciones internas
          </h2>
        </div>

        <div className="rounded-full bg-black px-4 py-2 text-sm text-white">
          {unreadCount} nuevas
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {notifications.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
            Las notificaciones importantes apareceran aqui.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-[28px] p-6 ${
                item.read_at
                  ? "bg-[#F7F5F2] text-neutral-500"
                  : "bg-black text-white"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] opacity-60">
                    {item.type}
                  </div>

                  <div className="mt-2 text-lg font-semibold">
                    {cleanNotificationText(item.title)}
                  </div>

                  {item.description && (
                    <div className="mt-2 opacity-70">
                      {cleanNotificationText(item.description)}
                    </div>
                  )}
                </div>

                {item.related_booking_id ? (
                  <Link
                    href={`/admin/reservas/${item.related_booking_id}`}
                    className="shrink-0 rounded-full bg-white px-4 py-2 text-xs text-black"
                  >
                    Ver reserva
                  </Link>
                ) : null}

                {!item.read_at && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="shrink-0 rounded-full bg-white px-4 py-2 text-xs text-black"
                  >
                    Leida
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
