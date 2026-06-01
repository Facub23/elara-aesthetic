"use client";

import { FormEvent, useState } from "react";

import AdminAccessRequestForm from "@/components/AdminAccessRequestForm";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage("No pudimos iniciar sesión con esos datos.");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-[#F6F3EE] text-black">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_0.86fr] lg:px-10">
        <section className="hidden min-h-[680px] overflow-hidden rounded-[40px] bg-black p-10 text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">
              EncuentraTuClinica
            </p>
            <h1 className="mt-8 max-w-xl text-6xl font-semibold leading-[0.95] tracking-tight">
              Panel privado para operar el marketplace.
            </h1>
          </div>

          <div className="grid gap-3">
            {[
              ["Reservas", "Control de agenda, estados y reprogramaciones."],
              ["Marketplace", "Clínicas, especialistas y tratamientos conectados."],
              ["Pre-lanzamiento", "Checklist de calidad antes de publicar."],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-[28px] border border-white/10 bg-white/10 p-5"
              >
                <p className="font-medium">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[36px] border border-black/5 bg-white/85 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.07)] backdrop-blur-xl sm:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Acceso administrativo
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight">
              Entrar al panel
            </h2>

            <p className="mt-4 text-sm leading-6 text-neutral-500">
              Área privada para gestionar reservas, contenido, pacientes y
              actividad interna.
            </p>

            <form onSubmit={handleLogin} className="mt-9 space-y-5">
              <div>
                <label
                  htmlFor="admin-email"
                  className="text-sm font-medium text-neutral-600"
                >
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 text-base outline-none transition focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="text-sm font-medium text-neutral-600"
                >
                  Contraseña
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 text-base outline-none transition focus:border-black"
                />
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-black text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <AdminAccessRequestForm />
          </div>
        </section>
      </div>
    </main>
  );
}
