import { supabase } from "@/lib/supabase";

function cleanReviewText(value?: string | null) {
  return (value || "").replace(/ELARA/gi, "EncuentraTuClinica");
}

export default async function VerifiedReviews() {
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", "Aprobada")
    .order("featured", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .limit(6);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#F6F3EE] px-6 py-28 text-black">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Opiniones verificadas
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-5xl md:text-7xl">
            Experiencias reales de pacientes EncuentraTuClinica.
          </h2>

          <p className="mt-8 text-xl leading-relaxed text-neutral-600">
            Opiniones de pacientes que completaron una cita dentro del
            ecosistema EncuentraTuClinica.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-full bg-black px-4 py-2 text-sm text-white">
                  Verificada
                </div>

                {review.featured && (
                  <div className="rounded-full bg-[#F2EEE8] px-4 py-2 text-sm">
                    Destacada
                  </div>
                )}
              </div>

              <div className="mt-8 text-3xl">
                {"*".repeat(review.rating || 5)}
              </div>

              <p className="mt-6 text-lg leading-relaxed text-neutral-700">
                &ldquo;{cleanReviewText(review.review)}&rdquo;
              </p>

              <div className="mt-8 border-t border-black/5 pt-6">
                <div className="text-xl font-semibold">
                  {cleanReviewText(review.patient_name) || "Paciente verificado"}
                </div>

                <div className="mt-2 text-sm text-neutral-500">
                  {cleanReviewText(review.treatment) ||
                    "Tratamiento EncuentraTuClinica"}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {review.clinic_name && (
                    <div className="rounded-full bg-[#F7F5F2] px-4 py-2 text-sm">
                      {cleanReviewText(review.clinic_name)}
                    </div>
                  )}

                  {review.specialist_name && (
                    <div className="rounded-full bg-[#F7F5F2] px-4 py-2 text-sm">
                      {cleanReviewText(review.specialist_name)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
