import Link from "next/link";

type ClinicCardProps = {
  name: string
  slug: string
  image: string
}

export function ClinicCard({
  name,
  slug,
  image,
}: ClinicCardProps) {
  return (
    <Link
      href={`/clinics/${slug}`}
      className="group block overflow-hidden rounded-[32px] border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-2xl"
    >

      {/* IMAGE */}

      <div className="relative h-[260px] overflow-hidden bg-neutral-200">

        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />

        <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm">
          Verificada
        </div>

      </div>

      {/* CONTENT */}

      <div className="p-6">

        <div className="flex items-start justify-between gap-4">

          <div>

            <h3 className="text-2xl font-semibold tracking-tight">
              {name}
            </h3>

            <p className="mt-2 text-neutral-600">
              Medicina estética avanzada
            </p>

          </div>

          <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium">
            4.9
          </div>

        </div>

        {/* TAGS */}

        <div className="mt-6 flex flex-wrap gap-2">

          <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
            Botox
          </div>

          <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
            Ácido hialurónico
          </div>

          <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
            Rinomodelación
          </div>

        </div>

        {/* FOOTER */}

        <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-6">

          <div>

            <p className="text-sm text-neutral-500">
              Desde
            </p>

            <div className="text-2xl font-semibold">
              290€
            </div>

          </div>

          <button className="rounded-full bg-black px-5 py-3 text-white transition hover:opacity-90">
            Reservar
          </button>

        </div>

      </div>

    </Link>
  )
}