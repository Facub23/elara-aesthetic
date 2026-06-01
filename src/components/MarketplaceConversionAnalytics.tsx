"use client";

type Booking = {
  id?: string | number;
  status?: string | null;
  treatment?: string | null;
  clinic_name?: string | null;
  specialist_name?: string | null;
  booking_source?: string | null;
  booking_context?: {
    price_from?: string | number | null;
  } | null;
};

const sourceLabels: Record<string, string> = {
  clinic_profile: "Ficha clinica",
  specialist_profile: "Ficha especialista",
  clinic_booking_page: "Pagina reserva",
  featured_clinic: "Clinica destacada",
  direct: "Directo",
};

function sourceLabel(source?: string | null) {
  return source
    ? sourceLabels[source] || source.replaceAll("_", " ")
    : "Sin origen";
}

function getPrice(value?: string | number | null) {
  if (!value) return null;

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.,]/g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value?: number | null) {
  if (!value) return "Sin datos";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function countBy<T extends string>(
  bookings: Booking[],
  getKey: (booking: Booking) => T
) {
  const map = new Map<T, number>();

  bookings.forEach((booking) => {
    const key = getKey(booking);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

export default function MarketplaceConversionAnalytics({
  bookings,
}: {
  bookings: Booking[];
}) {
  const marketplaceBookings = bookings.filter((booking) =>
    Boolean(booking.booking_source && booking.booking_source !== "direct")
  );
  const sourceRanking = countBy(bookings, (booking) =>
    sourceLabel(booking.booking_source)
  );
  const treatmentRanking = countBy(
    marketplaceBookings.length > 0 ? marketplaceBookings : bookings,
    (booking) => booking.treatment || "Sin tratamiento"
  ).slice(0, 5);
  const clinicRanking = countBy(
    marketplaceBookings.length > 0 ? marketplaceBookings : bookings,
    (booking) => booking.clinic_name || "Sin clinica"
  ).slice(0, 5);
  const specialistRanking = countBy(
    marketplaceBookings.length > 0 ? marketplaceBookings : bookings,
    (booking) => booking.specialist_name || "Sin especialista"
  ).slice(0, 5);
  const capturedPrices = bookings
    .map((booking) => getPrice(booking.booking_context?.price_from))
    .filter((price): price is number => Boolean(price));
  const averagePrice =
    capturedPrices.length > 0
      ? Math.round(
          capturedPrices.reduce((sum, price) => sum + price, 0) /
            capturedPrices.length
        )
      : null;
  const confirmedMarketplace = marketplaceBookings.filter(
    (booking) => booking.status === "Confirmada"
  ).length;
  const marketplaceConversion =
    marketplaceBookings.length > 0
      ? Math.round((confirmedMarketplace / marketplaceBookings.length) * 100)
      : 0;

  return (
    <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Conversion marketplace
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Origen y calidad de las reservas
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Mide que fichas y flujos generan solicitudes, que tratamientos
            convierten y que precio orientativo llega al checkout.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-3xl bg-black p-5 text-white">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50">
              Marketplace
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {marketplaceBookings.length}
            </div>
          </div>
          <div className="rounded-3xl bg-[#F7F5F2] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Conversion
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {marketplaceConversion}%
            </div>
          </div>
          <div className="rounded-3xl bg-[#F7F5F2] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Precio medio
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {formatPrice(averagePrice)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-4">
        <Ranking title="Reservas por origen" rows={sourceRanking} />
        <Ranking title="Tratamientos que convierten" rows={treatmentRanking} />
        <Ranking title="Clinicas que convierten" rows={clinicRanking} />
        <Ranking title="Especialistas que convierten" rows={specialistRanking} />
      </div>
    </section>
  );
}

function Ranking({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, number]>;
}) {
  return (
    <div className="rounded-[28px] bg-white p-5">
      <h3 className="text-sm font-semibold">{title}</h3>

      <div className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl bg-[#F7F5F2] p-4 text-sm text-neutral-500">
            Sin datos todavia.
          </div>
        ) : (
          rows.map(([label, total], index) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-2xl bg-[#F7F5F2] p-4 text-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                  {index + 1}
                </div>
                <span className="truncate font-medium capitalize">{label}</span>
              </div>
              <span className="shrink-0 text-lg font-semibold">{total}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
