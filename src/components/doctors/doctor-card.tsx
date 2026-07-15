type DoctorCardProps = {
  name: string
  specialty: string
  image: string
  experience: string
  city: string
}

export function DoctorCard({
  name,
  specialty,
  image,
  experience,
  city,
}: DoctorCardProps) {
  return (
    <div className="group overflow-hidden rounded-[32px] border border-black/5 bg-white transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

      {/* IMAGE */}

      <div className="relative h-[380px] overflow-hidden">

        <img
          src={image}
          alt={name}
          className="h-full w-full object-contain bg-[#F8F5F1] transition duration-700"
        />

        <div className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-2 text-xs font-medium backdrop-blur-md">
          Verificado
        </div>

      </div>

      {/* CONTENT */}

      <div className="p-6">

        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          {city}
        </p>

        <h3 className="mt-3 text-3xl font-semibold tracking-tight">
          {name}
        </h3>

        <p className="mt-2 text-lg text-neutral-600">
          {specialty}
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-black/5 pt-6">

          <div>

            <p className="text-sm text-neutral-500">
              Experiencia
            </p>

            <div className="mt-1 text-lg font-medium">
              {experience}
            </div>

          </div>

          <button className="rounded-full bg-black px-5 py-3 text-white transition hover:opacity-90">
            Ver perfil
          </button>

        </div>

      </div>

    </div>
  )
}