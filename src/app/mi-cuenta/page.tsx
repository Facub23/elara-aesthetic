"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { supabaseBrowser } from "@/lib/supabase/client";

type AccessMode = "login" | "register";

function getSafeDestination(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function PatientAccountContent() {
  const searchParams = useSearchParams();
  const destination = useMemo(
    () => getSafeDestination(searchParams.get("next")),
    [searchParams]
  );
  const [mode, setMode] = useState<AccessMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError("No pudimos iniciar sesion con esos datos.");
        setLoading(false);
        return;
      }

      window.location.href = destination;
      return;
    }

    const { data, error: registerError } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/mi-cuenta?next=${encodeURIComponent(
          destination
        )}`,
      },
    });

    if (registerError) {
      setError(registerError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = destination;
      return;
    }

    setLoading(false);
    setMessage("Revisa tu email para confirmar la cuenta y acceder a tus reservas.");
  }

  return (
    <main className="min-h-screen bg-[#F6F3EE] px-6 pb-16 pt-28 text-black">
      <Navbar />

      <div className="mx-auto grid min-h-[calc(100vh-140px)] max-w-5xl overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_24px_90px_rgba(0,0,0,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-black p-8 text-white lg:p-12">
          <Link href="/" className="text-sm uppercase tracking-[0.28em] text-white/55">
            EncuentraTuClinica
          </Link>
          <h1 className="mt-12 text-5xl font-semibold leading-tight tracking-tight">
            Tus citas y favoritos, en un solo lugar.
          </h1>
          <p className="mt-6 max-w-sm text-lg leading-8 text-white/65">
            Guarda clinicas, consulta tus reservas y vuelve a reservar tus
            tratamientos favoritos.
          </p>
        </section>

        <section className="p-8 lg:p-12">
          <div className="inline-flex rounded-full bg-[#F7F5F2] p-1">
            {[
              { value: "login" as const, label: "Entrar" },
              { value: "register" as const, label: "Crear cuenta" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMode(option.value);
                  setError("");
                  setMessage("");
                }}
                className={`rounded-full px-5 py-3 text-sm transition ${
                  mode === option.value ? "bg-black text-white" : "text-neutral-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Cuenta de paciente
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">
            {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            {mode === "register" && (
              <label className="block text-sm text-neutral-600">
                Nombre completo
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 text-black outline-none transition focus:border-black"
                />
              </label>
            )}

            <label className="block text-sm text-neutral-600">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 text-black outline-none transition focus:border-black"
              />
            </label>

            <label className="block text-sm text-neutral-600">
              Contrasena
              <input
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-[#F7F5F2] px-5 text-black outline-none transition focus:border-black"
              />
            </label>

            {error && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-2xl bg-black text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Procesando..."
                : mode === "login"
                  ? "Entrar a mi cuenta"
                  : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-7 text-sm text-neutral-500">
            Acceso interno del equipo:{" "}
            <Link href="/login" className="font-medium text-black underline">
              panel admin
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function PatientAccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F6F3EE]">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Cargando cuenta
          </p>
        </main>
      }
    >
      <PatientAccountContent />
    </Suspense>
  );
}
