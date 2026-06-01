type Booking = {
  id: number;
  clinic_name: string;
};

export default function TopCities({
  bookings,
}: {
  bookings: Booking[];
}) {
  const cities: Record<string, number> = {};

  bookings.forEach((booking) => {
    const clinic = booking.clinic_name || "Sin ciudad";

    const city =
      clinic.includes(",")
        ? clinic.split(",")[0].trim()
        : clinic;

    cities[city] = (cities[city] || 0) + 1;
  });

  const ranking = Object.entries(cities).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        Top ciudades
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Ciudades con más demanda
      </h2>

      <div className="mt-10 space-y-5">
        {ranking.length === 0 ? (
          <div className="rounded-[28px] bg-[#F7F5F2] p-10 text-center">
            No hay ciudades todavía.
          </div>
        ) : (
          ranking.map(([city, total], index) => (
            <div
              key={city}
              className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                  {index + 1}
                </div>

                <div>
                  <div className="text-xl font-semibold">
                    {city}
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