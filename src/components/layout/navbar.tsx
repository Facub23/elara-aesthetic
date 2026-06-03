"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    {
      label: "Inicio",
      href: "/",
    },
    {
      label: "Tratamientos",
      href: "/tratamientos",
    },
    {
      label: "Especialistas",
      href: "/especialistas",
    },
    {
      label: "Clinicas",
      href: "/clinics",
    },
    {
      label: "Mi cuenta",
      href: "/mi-cuenta",
    },
    {
      label: "Contacto",
      href: "/#contacto",
    },
  ];

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
      className="fixed left-0 top-0 z-50 w-full px-4 pt-4"
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between gap-6 rounded-full border px-4 py-3 transition-all duration-500 sm:px-6 ${
          scrolled
            ? "border-white/20 bg-white/70 shadow-[0_20px_80px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
            : "border-white/10 bg-white/40 backdrop-blur-xl"
        }`}
      >
        <Link
          href="/"
          className="group relative flex min-w-0 shrink items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white shadow-lg sm:h-11 sm:w-11">
            E
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-semibold sm:text-xl xl:text-2xl">
              EncuentraTuClinica
            </div>

            <div className="hidden text-[10px] uppercase tracking-[0.25em] text-neutral-500 sm:block">
              Clinicas verificadas
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative text-sm font-medium text-neutral-600 transition duration-300 hover:text-black"
            >
              {item.label}
              <span className="absolute -bottom-2 left-0 h-[1px] w-0 bg-black transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/especialistas"
            className="hidden shrink-0 items-center rounded-full bg-black px-5 py-3 text-sm text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-[1.04] hover:opacity-95 md:flex xl:px-7"
          >
            Buscar disponibilidad
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/70 backdrop-blur-xl md:hidden"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
          >
            <div className="relative h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-black transition-all duration-300 ${
                  menuOpen ? "top-[7px] rotate-45" : ""
                }`}
              />

              <span
                className={`absolute left-0 top-[7px] h-[2px] w-full rounded-full bg-black transition-all duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />

              <span
                className={`absolute left-0 top-[14px] h-[2px] w-full rounded-full bg-black transition-all duration-300 ${
                  menuOpen ? "top-[7px] -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#F6F3EE]/95 backdrop-blur-2xl md:hidden"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-24 text-center"
            >
              <div className="mb-10">
                <div className="mx-auto max-w-[320px] text-4xl font-semibold leading-none sm:max-w-none sm:text-5xl">
                  EncuentraTuClinica
                </div>

                <div className="mt-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Marketplace medico estetico
                </div>
              </div>

              <div className="flex flex-col items-center gap-5">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-3xl font-semibold sm:text-5xl"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <Link
                href="/especialistas"
                onClick={() => setMenuOpen(false)}
                className="mt-16 rounded-full bg-black px-10 py-5 text-lg text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              >
                Buscar disponibilidad
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
