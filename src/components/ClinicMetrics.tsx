import {
  getBookingStatusKey,
  isPendingBookingStatus,
} from "@/lib/booking-status";

type Booking = {
  id: number;
  clinic_name: string;
  full_name: string;
  status: string;
};

export default function ClinicMetrics({
  bookings,
}: {
  bookings: Booking[];
}) {
  const metrics: Record<
    string,
    {
      total: number;
      confirmed: number;
      pending: number;
      cancelled: number;
    }
  > = {};

  bookings.forEach((booking) => {
    const clinic = booking.clinic_name || "Sin clínica";

    if (!metrics[clinic]) {
      metrics[clinic] = {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
      };
    }

    metrics[clinic].total += 1;

    if (getBookingStatusKey(booking.status) === "confirmed") {
      metrics[clinic].confirmed += 1;
    }

    if (isPendingBookingStatus(booking.status)) {
      metrics[clinic].pending += 1;
    }

    if (getBookingStatusKey(booking.status) === "cancelled") {
      metrics[clinic].cancelled += 1;
    }
  });

  const clinicMetrics = Object.entries(metrics);

  return (
    <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        Métricas por clínica
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Rendimiento de clínicas
      </h2>

      <div className="mt-10 space-y-5">
        {clinicMetrics.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-10 text-center">
            No hay métricas todavía.
          </div>
        ) : (
          clinicMetrics.map(([clinic, data]) => (
            <div
              key={clinic}
              className="rounded-[32px] bg-[#F7F5F2] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold leading-tight">
                    {clinic}
                  </h3>

                  <p className="mt-2 text-sm text-neutral-500">
                    {data.total} reservas totales
                  </p>
                </div>

                <div className="shrink-0 rounded-full bg-black px-5 py-3 text-sm text-white">
                  {data.total} reservas
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ["Confirmadas", data.confirmed],
                  ["Pendientes", data.pending],
                  ["Canceladas", data.cancelled],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-[22px] bg-white px-5 py-4"
                  >
                    <span className="text-sm text-neutral-500">
                      {label}
                    </span>

                    <span className="text-2xl font-semibold">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
