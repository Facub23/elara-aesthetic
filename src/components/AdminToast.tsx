"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastData = {
  message: string;
  type?: "success" | "error" | "info";
};

export function showAdminToast(
  message: string,
  type: "success" | "error" | "info" = "info"
) {
  window.dispatchEvent(
    new CustomEvent("admin-toast", {
      detail: {
        message,
        type,
      },
    })
  );
}

export default function AdminToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastData>;

      setToast(customEvent.detail);

      setTimeout(() => {
        setToast(null);
      }, 3500);
    }

    window.addEventListener("admin-toast", handleToast);

    return () => {
      window.removeEventListener("admin-toast", handleToast);
    };
  }, []);

  const styles = {
    success: "bg-black text-white",
    error: "bg-red-500 text-white",
    info: "bg-white text-black border border-black/10",
  };

  return (
    <AnimatePresence>
      {toast && (
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
          className={`fixed bottom-8 right-8 z-[1000000] max-w-sm rounded-[28px] px-6 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)] ${
            styles[toast.type || "info"]
          }`}
        >
          <div className="text-xs uppercase tracking-[0.18em] opacity-60">
            EncuentraTuClinica
          </div>

          <div className="mt-2 text-lg font-semibold">
            {toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
