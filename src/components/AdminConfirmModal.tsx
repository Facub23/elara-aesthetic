"use client";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function AdminConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  loading,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">

      <div className="w-full max-w-md rounded-[40px] bg-white p-8 shadow-[0_20px_100px_rgba(0,0,0,0.25)]">

        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          EncuentraTuClinica
        </div>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          {title}
        </h2>

        <p className="mt-4 text-neutral-500">
          {description}
        </p>

        <div className="mt-10 flex gap-4">

          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-full border border-black/10 px-6 py-4"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-black px-6 py-4 text-white"
          >
            {loading
              ? "Procesando..."
              : confirmText}
          </button>

        </div>

      </div>

    </div>
  );
}
