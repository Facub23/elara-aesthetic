"use client";

import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

type Review = {
  id: string;
  patient_name?: string;
  clinic_name?: string;
  specialist_name?: string;
  treatment?: string;
  rating?: number;
  review?: string;
  status?: string;
  featured?: boolean;
  created_at?: string;
};

function getStatusClass(status: string) {
  if (status === "Aprobada") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (status === "Rechazada") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  return "bg-amber-100 text-amber-700 border-amber-200";
}

export default function ReviewsManager({
  initialReviews,
}: {
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function updateReview(id: string, values: Partial<Review>) {
    setNotice("");
    setLoadingId(id);

    const { error } = await supabaseBrowser
      .from("reviews")
      .update(values)
      .eq("id", id);

    setLoadingId(null);

    if (error) {
      setNotice(error.message || "Error actualizando review");
      return;
    }

    setReviews((prev) =>
      prev.map((review) =>
        review.id === id
          ? {
              ...review,
              ...values,
            }
          : review
      )
    );
    setNotice("Opinion actualizada.");
  }

  async function deleteReview(id: string) {
    setNotice("");
    setLoadingId(id);

    const { error } = await supabaseBrowser
      .from("reviews")
      .delete()
      .eq("id", id);

    setLoadingId(null);

    if (error) {
      setNotice(error.message || "Error eliminando review");
      return;
    }

    setReviews((prev) => prev.filter((review) => review.id !== id));
    setDeleteId(null);
    setNotice("Opinion eliminada.");
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-3xl border border-black/5 bg-white/80 px-5 py-4 text-sm text-neutral-700">
          {notice}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-[32px] bg-white/70 p-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
          No hay reviews todavia.
        </div>
      ) : (
        reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-semibold">
                    {review.patient_name || "Paciente verificado"}
                  </h2>

                  <div
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${getStatusClass(
                      review.status || "Pendiente"
                    )}`}
                  >
                    {review.status || "Pendiente"}
                  </div>

                  {review.featured && (
                    <div className="rounded-full bg-black px-4 py-2 text-sm text-white">
                      Destacada
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {review.clinic_name && (
                    <div className="rounded-full bg-[#F5F1EB] px-4 py-2 text-sm">
                      {review.clinic_name}
                    </div>
                  )}

                  {review.specialist_name && (
                    <div className="rounded-full bg-[#F5F1EB] px-4 py-2 text-sm">
                      {review.specialist_name}
                    </div>
                  )}

                  {review.treatment && (
                    <div className="rounded-full bg-[#F5F1EB] px-4 py-2 text-sm">
                      {review.treatment}
                    </div>
                  )}

                  <div className="rounded-full bg-black px-4 py-2 text-sm text-white">
                    {review.rating || 5}/5
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] bg-[#F7F5F2] p-6 text-lg leading-relaxed">
                  {review.review || "Sin comentario"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:w-[360px] xl:justify-end">
                <button
                  disabled={loadingId === review.id}
                  onClick={() =>
                    updateReview(review.id, {
                      status: "Aprobada",
                    })
                  }
                  className="rounded-full bg-emerald-600 px-5 py-3 text-sm text-white disabled:opacity-50"
                >
                  Aprobar
                </button>

                <button
                  disabled={loadingId === review.id}
                  onClick={() =>
                    updateReview(review.id, {
                      status: "Rechazada",
                    })
                  }
                  className="rounded-full bg-red-600 px-5 py-3 text-sm text-white disabled:opacity-50"
                >
                  Rechazar
                </button>

                <button
                  disabled={loadingId === review.id}
                  onClick={() =>
                    updateReview(review.id, {
                      featured: !review.featured,
                    })
                  }
                  className="rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-50"
                >
                  {review.featured ? "Quitar destacada" : "Destacar"}
                </button>

                <button
                  disabled={loadingId === review.id}
                  onClick={() =>
                    deleteId === review.id
                      ? deleteReview(review.id)
                      : setDeleteId(review.id)
                  }
                  className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm disabled:opacity-50"
                >
                  {deleteId === review.id ? "Confirmar eliminar" : "Eliminar"}
                </button>

                {deleteId === review.id && (
                  <button
                    disabled={loadingId === review.id}
                    onClick={() => setDeleteId(null)}
                    className="rounded-full border border-black/10 bg-[#F7F5F2] px-5 py-3 text-sm disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
