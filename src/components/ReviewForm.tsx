"use client";

import { FormEvent, useState } from "react";

export default function ReviewForm({
  bookingId,
  reviewToken,
}: {
  bookingId: string;
  reviewToken: string;
}) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = review.trim();

    if (message.length < 10) {
      setError("Escribe al menos 10 caracteres para ayudarnos a validar tu experiencia.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/create-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        review_token: reviewToken,
        rating,
        review: message,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No pudimos registrar tu opinion.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-lg bg-black p-10 text-center text-white">
        <div className="text-sm uppercase tracking-[0.25em] text-white/55">
          Opinion recibida
        </div>
        <div className="mt-5 text-3xl font-semibold">Gracias por compartir tu experiencia</div>
        <p className="mt-3 text-white/70">
          Tu opinion sera revisada antes de mostrarse publicamente.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-black/10 bg-white p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]"
    >
      <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
        Reserva completada y verificada
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        Como fue tu experiencia?
      </h2>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-neutral-600">Valoracion</legend>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`Valorar con ${star} de 5`}
              className={`flex h-12 w-12 items-center justify-center rounded-md border text-lg font-semibold transition ${
                rating >= star
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white text-neutral-400"
              }`}
            >
              {star}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-8 block text-sm font-medium text-neutral-600" htmlFor="review">
        Tu opinion
      </label>
      <textarea
        id="review"
        value={review}
        minLength={10}
        maxLength={1500}
        required
        onChange={(event) => setReview(event.target.value)}
        placeholder="Cuentanos como fue la consulta, la atencion y el tratamiento."
        className="mt-3 h-40 w-full resize-none rounded-md border border-black/10 bg-[#F7F5F2] p-5 outline-none focus:border-black"
      />
      <p className="mt-2 text-right text-xs text-neutral-500">{review.length}/1500</p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 rounded-md bg-black px-7 py-4 text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar opinion"}
      </button>
    </form>
  );
}
