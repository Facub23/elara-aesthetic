import Link from "next/link";

type Delivery = {
  id: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  status: string;
  provider: string | null;
  related_booking_id?: string | number | null;
  created_at: string;
};

const statusClasses: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700",
  pending: "bg-neutral-100 text-neutral-600",
};

const channelLabels: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp (pendiente)",
  sms: "SMS (pendiente)",
};

const statusLabels: Record<string, string> = {
  sent: "Enviado",
  failed: "Fallido",
  skipped: "Pendiente",
  pending: "Pendiente",
};

export default function AdminDeliveryLog({
  deliveries,
}: {
  deliveries: Delivery[];
}) {
  return (
    <div className="mt-10 rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        Canales
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Entregas recientes
      </h2>

      <div className="mt-8 grid gap-3">
        {deliveries.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-6 text-neutral-500">
            Todavía no hay entregas registradas.
          </div>
        ) : (
          deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="grid gap-3 rounded-[28px] bg-[#F7F5F2] p-5 md:grid-cols-[120px_1fr_auto]"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-neutral-500">
                {channelLabels[delivery.channel] || delivery.channel}
              </div>

              <div>
                <div className="font-semibold">
                  {delivery.subject || "Sin asunto"}
                </div>

                <div className="mt-1 text-sm text-neutral-500">
                  {delivery.recipient || "Sin destinatario"} -{" "}
                  {delivery.provider || "sin proveedor"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`h-fit rounded-full px-3 py-1 text-sm ${
                    statusClasses[delivery.status] ||
                    statusClasses.pending
                  }`}
                >
                  {statusLabels[delivery.status] || delivery.status}
                </span>

                {delivery.related_booking_id ? (
                  <Link
                    href={`/admin/reservas/${delivery.related_booking_id}`}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm transition hover:border-black"
                  >
                    Ver reserva
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
