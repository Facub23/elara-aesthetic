type TreatmentCardProps = {
  title: string
  image: string
}

export function TreatmentCard({
  title,
  image,
}: TreatmentCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[32px]">

      {/* IMAGE */}

      <div className="h-[420px] overflow-hidden">

        <img
          src={image}
          alt={title}
          className="h-full w-full object-contain bg-[#F8F5F1] transition duration-700"
        />

      </div>

      {/* OVERLAY */}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* CONTENT */}

      <div className="absolute bottom-0 left-0 w-full p-6 text-white">

        <p className="text-sm uppercase tracking-[0.2em] text-white/70">
          Trending Treatment
        </p>

        <h3 className="mt-2 text-4xl font-semibold tracking-tight">
          {title}
        </h3>

        <button className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-neutral-200">
          Explorar tratamiento
        </button>

      </div>

    </div>
  )
}