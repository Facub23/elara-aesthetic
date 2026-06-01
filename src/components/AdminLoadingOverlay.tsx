"use client";

export default function AdminLoadingOverlay({
  show,
  text = "Cargando...",
}: {
  show: boolean;
  text?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 backdrop-blur-sm">

      <div className="rounded-[32px] bg-white px-10 py-8 shadow-[0_20px_100px_rgba(0,0,0,0.25)]">

        <div className="flex items-center gap-5">

          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-black" />

          <div>

            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              EncuentraTuClinica
            </div>

            <div className="mt-1 text-2xl font-semibold">
              {text}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
