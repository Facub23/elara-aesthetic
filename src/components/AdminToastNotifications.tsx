"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Notification = {
  title?: string;
  description?: string | null;
};

export default function AdminToastNotifications() {
  const [toast, setToast] = useState("");

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("admin-toast-notifications")
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

          setToast(
            notification.title ||
              notification.description ||
              "Nueva notificación"
          );

          setTimeout(() => {
            setToast("");
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] rounded-[28px] bg-black px-6 py-5 text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="text-sm uppercase tracking-[0.25em] text-white/60">
        EncuentraTuClinica Inbox
      </div>

      <div className="mt-2 text-lg font-semibold">
        {toast}
      </div>
    </div>
  );
}
