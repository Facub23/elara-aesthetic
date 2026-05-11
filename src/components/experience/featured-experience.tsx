export function FeaturedExperience() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-32">

      <div className="grid items-center gap-16 lg:grid-cols-2">

        {/* IMAGE */}

        <div className="relative overflow-hidden rounded-[40px]">

          <img
            src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1600&auto=format&fit=crop"
            alt="Experience"
            className="h-[700px] w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          <div className="absolute bottom-8 left-8 rounded-full bg-white/10 px-5 py-3 text-sm text-white backdrop-blur-xl">
            Experiencia premium verificada
          </div>

        </div>

        {/* CONTENT */}

        <div>

          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            El futuro de la medicina estética
          </p>

          <h2 className="mt-6 text-6xl font-semibold leading-tight tracking-tight">
            Reserva tratamientos con total transparencia.
          </h2>

          <p className="mt-8 text-xl leading-relaxed text-neutral-600">
            Encuentra especialistas verificados, compara resultados reales y reserva online en menos de un minuto.
          </p>

          <div className="mt-12 space-y-6">

            <div className="flex gap-4">

              <div className="mt-1 h-3 w-3 rounded-full bg-black" />

              <div>

                <h3 className="text-lg font-medium">
                  Clínicas verificadas
                </h3>

                <p className="mt-1 text-neutral-600">
                  Validación manual y certificaciones reales.
                </p>

              </div>

            </div>

            <div className="flex gap-4">

              <div className="mt-1 h-3 w-3 rounded-full bg-black" />

              <div>

                <h3 className="text-lg font-medium">
                  Precios transparentes
                </h3>

                <p className="mt-1 text-neutral-600">
                  Sin sorpresas ni presupuestos ocultos.
                </p>

              </div>

            </div>

            <div className="flex gap-4">

              <div className="mt-1 h-3 w-3 rounded-full bg-black" />

              <div>

                <h3 className="text-lg font-medium">
                  Reserva inmediata
                </h3>

                <p className="mt-1 text-neutral-600">
                  Agenda online conectada en tiempo real.
                </p>

              </div>

            </div>

          </div>

          <button className="mt-12 rounded-full bg-black px-8 py-4 text-white transition hover:opacity-90">
            Explorar clínicas premium
          </button>

        </div>

      </div>

    </section>
  )
}