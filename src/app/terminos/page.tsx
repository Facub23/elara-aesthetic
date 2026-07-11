import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "Terminos y condiciones",
  description:
    "Terminos de uso de EncuentraTuClinica para pacientes, clinicas y especialistas.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <section className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
            Legal
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Terminos y condiciones
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            EncuentraTuClinica es un marketplace para descubrir clinicas,
            especialistas y tratamientos de medicina estetica. Estos terminos
            son una base de pre-lanzamiento y deben revisarse legalmente antes
            de operar con pacientes reales a escala.
          </p>

          <div className="mt-10 grid gap-5">
            {[
              [
                "Naturaleza del servicio",
                "La plataforma facilita comparacion, informacion y solicitudes de reserva. La prestacion sanitaria o estetica corresponde a la clinica o especialista seleccionado.",
              ],
              [
                "Reservas",
                "Las reservas pueden requerir confirmacion por email. El horario puede quedar protegido temporalmente hasta completar la confirmacion.",
              ],
              [
                "Informacion y precios",
                "Los precios mostrados son orientativos salvo indicacion expresa. La clinica puede confirmar condiciones finales antes de la prestacion del servicio.",
              ],
              [
                "Responsabilidad profesional",
                "Cada clinica o especialista es responsable de la informacion clinica, indicaciones, contraindicaciones, consentimiento informado y ejecucion del tratamiento.",
              ],
              [
                "Uso correcto",
                "El usuario se compromete a proporcionar datos veraces, no abusar de reservas y respetar las politicas de cancelacion o reprogramacion.",
              ],
              [
                "Cambios del servicio",
                "EncuentraTuClinica puede modificar funcionalidades, contenidos o disponibilidad del servicio para mejorar seguridad, calidad u operacion.",
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
