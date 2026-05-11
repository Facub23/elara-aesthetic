"use client";

import Link from "next/link";

export function Footer() {

  return (

    <footer className="relative overflow-hidden border-t border-black/5 bg-white">

      <div className="mx-auto max-w-7xl px-6 py-24">

        <div className="grid gap-16 lg:grid-cols-4">

          {/* BRAND */}

          <div className="lg:col-span-2">

            <div className="text-4xl font-semibold tracking-tight">
              ELARA
            </div>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
              Luxury platform specialized in premium aesthetic clinics,
              facial harmonization and advanced aesthetic medicine.
            </p>

            <div className="mt-10 flex items-center gap-4">

              <a
                href="#"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-[#f5f5f5] transition hover:scale-105"
              >
                IG
              </a>

              <a
                href="#"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-[#f5f5f5] transition hover:scale-105"
              >
                TW
              </a>

              <a
                href="#"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-[#f5f5f5] transition hover:scale-105"
              >
                IN
              </a>

            </div>

          </div>

          {/* LINKS */}

          <div>

            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Navigation
            </div>

            <div className="mt-8 flex flex-col gap-5">

              <Link
                href="/"
                className="text-neutral-600 transition hover:text-black"
              >
                Home
              </Link>

              <Link
                href="/clinics"
                className="text-neutral-600 transition hover:text-black"
              >
                Clínicas
              </Link>

              <Link
                href="/clinics"
                className="text-neutral-600 transition hover:text-black"
              >
                Especialistas
              </Link>

              <Link
                href="/clinics"
                className="text-neutral-600 transition hover:text-black"
              >
                Reservar
              </Link>

            </div>

          </div>

          {/* CONTACT */}

          <div>

            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Contact
            </div>

            <div className="mt-8 flex flex-col gap-5 text-neutral-600">

              <div>
                hello@elara-aesthetic.com
              </div>

              <div>
                +34 600 111 222
              </div>

              <div>
                Madrid, Spain
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM */}

        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-black/5 pt-8 text-sm text-neutral-500 md:flex-row">

          <div>
            © 2026 ELARA Aesthetic. All rights reserved.
          </div>

          <div className="flex items-center gap-6">

            <Link
              href="/"
              className="transition hover:text-black"
            >
              Privacy
            </Link>

            <Link
              href="/"
              className="transition hover:text-black"
            >
              Terms
            </Link>

          </div>

        </div>

      </div>

    </footer>
  );
}