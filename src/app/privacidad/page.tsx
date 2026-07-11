import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "Politica de privacidad",
  description:
    "Politica de privacidad de EncuentraTuClinica para pacientes, clinicas y especialistas.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <section className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
            Legal
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Politica de privacidad
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            Esta pagina resume como EncuentraTuClinica trata los datos personales
            necesarios para comparar clinicas, gestionar solicitudes de reserva y
            operar el panel profesional. Antes del lanzamiento publico debe ser
            revisada y adaptada por asesoria legal.
          </p>

          <div className="mt-10 grid gap-5">
            {[
              [
                "Datos que podemos tratar",
                "Nombre, email, telefono, tratamiento solicitado, clinica, especialista, fecha y hora de reserva, comunicaciones transaccionales y datos tecnicos basicos de uso.",
              ],
              [
                "Finalidad",
                "Gestionar reservas, confirmaciones, recordatorios, cancelaciones, reprogramaciones, reviews verificadas y comunicacion operativa entre paciente y clinica.",
              ],
              [
                "Base de legitimacion",
                "Ejecucion de la solicitud del usuario, interes legitimo en seguridad y mejora del servicio, y consentimiento cuando sea necesario.",
              ],
              [
                "Conservacion",
                "Los datos se conservaran durante el tiempo necesario para prestar el servicio, atender obligaciones legales y mantener trazabilidad operativa.",
              ],
              [
                "Encargados y proveedores",
                "Podemos usar proveedores como Supabase, Vercel, Resend y servicios de calendario para alojar, procesar y enviar comunicaciones necesarias.",
              ],
              [
                "Derechos",
                "Puedes solicitar acceso, rectificacion, supresion, oposicion, limitacion o portabilidad escribiendo a hello@encuentratuclinica.es.",
              ],
            ].map(([title, text]) => (
              <article
                key={title}
                className="rounded-lg border border-black/10 bg-white p-6"
              >
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-3 leading-7 text-neutral-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-lg bg-black p-6 text-white">
            <h2 className="text-2xl font-semibold">Contacto de privacidad</h2>
            <p className="mt-3 leading-7 text-white/65">
              Para cualquier consulta sobre privacidad o tratamiento de datos,
              escribe a hello@encuentratuclinica.es.
            </p>
          </div>

          <Link
            href="/"
            className="mt-10 inline-flex rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium transition hover:border-black"
          >
            Volver al marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}
