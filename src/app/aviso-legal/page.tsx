import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Aviso legal de EncuentraTuClinica.",
};

export default function LegalNoticePage() {
  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <section className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
            Legal
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Aviso legal
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            Esta informacion identifica la base legal del sitio en fase de
            pre-lanzamiento. Antes de la publicacion definitiva deben completarse
            razon social, NIF/CIF, domicilio, datos registrales y condiciones
            especificas del operador.
          </p>

          <div className="mt-10 grid gap-5">
            {[
              ["Titular provisional", "EncuentraTuClinica."],
              ["Contacto", "hello@encuentratuclinica.es."],
              ["Ambito", "Marketplace digital de medicina estetica en Espana."],
              [
                "Propiedad intelectual",
                "Los textos, marca, diseno, codigo y contenidos del sitio pertenecen a sus titulares o se usan con licencia/autorizacion.",
              ],
              [
                "Responsabilidad",
                "La plataforma no sustituye la valoracion profesional de una clinica o especialista. La informacion publicada debe verificarse antes de cualquier tratamiento.",
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
