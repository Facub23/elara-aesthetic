export function SearchBar() {
  return (
    <div className="mt-12 w-full max-w-5xl overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-2xl shadow-black/[0.03]">

      <div className="grid grid-cols-1 md:grid-cols-4">

        {/* CITY */}

        <div className="border-b border-black/5 p-6 md:border-b-0 md:border-r">

          <p className="text-sm font-medium">
            Ciudad
          </p>

          <input
            placeholder="Madrid"
            className="mt-2 w-full bg-transparent text-neutral-600 outline-none"
          />

        </div>

        {/* TREATMENT */}

        <div className="border-b border-black/5 p-6 md:border-b-0 md:border-r">

          <p className="text-sm font-medium">
            Tratamiento
          </p>

          <input
            placeholder="Botox"
            className="mt-2 w-full bg-transparent text-neutral-600 outline-none"
          />

        </div>

        {/* DATE */}

        <div className="border-b border-black/5 p-6 md:border-b-0 md:border-r">

          <p className="text-sm font-medium">
            Fecha
          </p>

          <input
            placeholder="Esta semana"
            className="mt-2 w-full bg-transparent text-neutral-600 outline-none"
          />

        </div>

        {/* BUTTON */}

        <div className="flex items-center justify-center p-4">

          <button className="w-full rounded-2xl bg-black px-6 py-4 text-white transition hover:opacity-90">
            Buscar clínicas
          </button>

        </div>

      </div>

    </div>
  )
}