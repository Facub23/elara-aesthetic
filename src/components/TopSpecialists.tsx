"use client";

export default function TopSpecialists({
  bookings,
}: {
  bookings: any[];
}) {
  const specialistCount: Record<string, number> = {};

  bookings.forEach((booking) => {
    const specialist =
      booking.specialist_name || "Sin especialista";

    specialistCount[specialist] =
      (specialistCount[specialist] || 0) + 1;
  });

  const data = Object.entries(specialistCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="rounded-[40px] bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        Especialistas
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Top especialistas
      </h2>

      <div className="mt-8 space-y-4">
        {data.map(([name, total]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-[28px] bg-[#F7F5F2] p-5"
          >
            <span className="font-medium">
              {name}
            </span>

            <span className="rounded-full bg-black px-4 py-2 text-sm text-white">
              {total} reservas
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}