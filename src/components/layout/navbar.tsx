"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };

  }, []);

  return (

    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed left-0 top-0 z-50 w-full px-4 pt-4"
    >

      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-6 py-4 transition-all duration-500 ${
          scrolled
            ? "border-black/5 bg-white/75 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl"
            : "border-transparent bg-white/40 backdrop-blur-xl"
        }`}
      >

        {/* LOGO */}

        <Link
          href="/"
          className="text-2xl font-semibold tracking-tight transition hover:opacity-70"
        >
          ELARA
        </Link>

        {/* DESKTOP NAV */}

        <nav className="hidden items-center gap-10 md:flex">

          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 transition hover:text-black"
          >
            Home
          </Link>

          <Link
            href="/clinics"
            className="text-sm font-medium text-neutral-600 transition hover:text-black"
          >
            Clínicas
          </Link>

          <Link
            href="/clinics"
            className="text-sm font-medium text-neutral-600 transition hover:text-black"
          >
            Especialistas
          </Link>

          <Link
            href="/clinics"
            className="text-sm font-medium text-neutral-600 transition hover:text-black"
          >
            Contacto
          </Link>

        </nav>

        {/* RIGHT */}

        <div className="flex items-center gap-3">

          {/* CTA DESKTOP */}

          <Link
            href="/clinics"
            className="hidden rounded-full bg-black px-6 py-3 text-sm text-white transition-all duration-300 hover:scale-105 hover:opacity-90 md:flex"
          >
            Reservar
          </Link>

          {/* MOBILE BUTTON */}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-white/80 backdrop-blur-xl md:hidden"
          >

            <div className="relative h-4 w-5">

              <span
                className={`absolute left-0 top-0 h-[2px] w-full bg-black transition-all duration-300 ${
                  menuOpen ? "top-[7px] rotate-45" : ""
                }`}
              />

              <span
                className={`absolute left-0 top-[7px] h-[2px] w-full bg-black transition-all duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />

              <span
                className={`absolute left-0 top-[14px] h-[2px] w-full bg-black transition-all duration-300 ${
                  menuOpen ? "top-[7px] -rotate-45" : ""
                }`}
              />

            </div>

          </button>

        </div>

      </div>

      {/* MOBILE MENU */}

      <AnimatePresence>

        {menuOpen && (

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-40 bg-white/90 backdrop-blur-2xl md:hidden"
          >

            <div className="flex h-full flex-col items-center justify-center gap-10">

              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="text-5xl font-semibold tracking-tight"
              >
                Home
              </Link>

              <Link
                href="/clinics"
                onClick={() => setMenuOpen(false)}
                className="text-5xl font-semibold tracking-tight"
              >
                Clínicas
              </Link>

              <Link
                href="/clinics"
                onClick={() => setMenuOpen(false)}
                className="text-5xl font-semibold tracking-tight"
              >
                Especialistas
              </Link>

              <Link
                href="/clinics"
                onClick={() => setMenuOpen(false)}
                className="text-5xl font-semibold tracking-tight"
              >
                Contacto
              </Link>

              <Link
                href="/clinics"
                onClick={() => setMenuOpen(false)}
                className="mt-6 rounded-full bg-black px-10 py-5 text-lg text-white"
              >
                Reservar cita
              </Link>

            </div>

          </motion.div>

        )}

      </AnimatePresence>

    </motion.header>
  );
}