type Booking = {
  id: number;
  treatment: string;
};

export default function TopTreatments({
  bookings,
}: {
  bookings: Booking[];
}) {
  const treatments: Record<string, number> = {};

  bookings.forEach((booking) => {
    const treatment = booking.treatment || "Sin tratamiento";

    treatments[treatment] =
      (treatments[treatment] || 0) + 1;
  });

  const ranking = Object.entries(treatments).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        Top tratamientos
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Tratamientos más solicitados
      </h2>

      <div className="mt-10 space-y-5">
        {ranking.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-10 text-center">
            No hay tratamientos todavía.
          </div>
        ) : (
          ranking.map(([treatment, total], index) => (
            <div
              key={treatment}
              className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                  {index + 1}
                </div>

                <div>
                  <div className="text-xl font-semibold">
                    {treatment}
                  </div>

                  <div className="mt-1 text-sm text-neutral-500">
                    {total} reservas
                  </div>
                </div>
              </div>

              <div className="text-3xl font-semibold">
                {total}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}