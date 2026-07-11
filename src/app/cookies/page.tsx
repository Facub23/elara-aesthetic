import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description: "Politica de cookies de EncuentraTuClinica.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <Navbar />

      <section className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
            Legal
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Politica de cookies
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            En fase de pre-lanzamiento, EncuentraTuClinica usa cookies tecnicas
            necesarias para autenticacion, seguridad y funcionamiento del sitio.
            Si se activan analiticas o marketing, se debera incorporar banner de
            consentimiento y panel de preferencias.
          </p>

          <div className="mt-10 grid gap-5">
            {[
              [
                "Cookies tecnicas",
                "Necesarias para mantener sesiones, proteger rutas privadas y permitir funcionalidades esenciales.",
              ],
              [
                "Cookies analiticas",
                "No deben activarse sin revisar la base legal y, cuando corresponda, solicitar consentimiento.",
              ],
              [
                "Cookies de marketing",
                "No deben activarse en pre-lanzamiento salvo que exista consentimiento y documentacion especifica.",
              ],
              [
                "Gestion",
                "El usuario puede borrar o bloquear cookies desde la configuracion de su navegador. Algunas funciones podrian dejar de funcionar.",
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
