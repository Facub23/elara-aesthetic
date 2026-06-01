"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 p-6 backdrop-blur-xl"
        >
          <div
            onClick={onCancel}
            className="absolute inset-0"
          />

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            transition={{
              duration: 0.35,
            }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-[36px] bg-[#F6F3EE] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.28)]"
          >
            <div className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              EncuentraTuClinica CMS
            </div>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight">
              {title}
            </h2>

            {description && (
              <p className="mt-5 text-lg leading-relaxed text-neutral-600">
                {description}
              </p>
            )}

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-black/10 bg-white px-7 py-4 text-sm transition-all duration-300 hover:bg-black hover:text-white"
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-full px-7 py-4 text-sm text-white transition-all duration-300 hover:scale-[1.02] ${
                  danger ? "bg-red-500" : "bg-black"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}