"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type ActivityLog = {
  id: string;
  title: string;
  description: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at: string;
};

const legacyConfirmation =
  "confirmaci" + String.fromCharCode(195, 179) + "n";

function cleanActivityText(value?: string | null) {
  return (value || "")
    .replaceAll(legacyConfirmation, "confirmacion")
    .replace(/ELARA/gi, "EncuentraTuClinica");
}

export default function AdminActivityFeed({
  initialLogs,
}: {
  initialLogs: ActivityLog[];
}) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs || []);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("activity-logs-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        (payload) => {
          const newLog = payload.new as ActivityLog;

          setLogs((prev) => [newLog, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        Actividad
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Registro administrativo
      </h2>

      <div className="mt-8 space-y-4">
        {logs.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
            No hay actividad todavia.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-[28px] bg-[#F7F5F2] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {cleanActivityText(log.title)}
                  </div>

                  {log.description && (
                    <div className="mt-2 text-neutral-500">
                      {cleanActivityText(log.description)}
                    </div>
                  )}

                  {log.actor_email ? (
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-neutral-400">
                      {log.actor_email} - {log.actor_role || "admin"}
                    </div>
                  ) : null}

                  {log.entity_type === "booking" && log.entity_id ? (
                    <Link
                      href={`/admin/reservas/${log.entity_id}`}
                      className="mt-4 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs transition hover:border-black"
                    >
                      Ver reserva
                    </Link>
                  ) : null}
                </div>

                <div className="text-sm text-neutral-400">
                  {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
