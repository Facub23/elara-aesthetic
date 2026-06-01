"use client";

import { useEffect } from "react";

type EditorStep = {
  id: string;
  label: string;
};

export default function AdminEntityEditorShell({
  eyebrow = "EncuentraTuClinica CMS",
  title,
  steps,
  activeStep,
  onStepChange,
  onCancel,
  primaryAction,
  secondaryAction,
  children,
}: {
  eyebrow?: string;
  title: string;
  steps: EditorStep[];
  activeStep: string;
  onStepChange: (step: string) => void;
  onCancel: () => void;
  primaryAction: {
    label: string;
    loadingLabel?: string;
    loading?: boolean;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    loadingLabel?: string;
    loading?: boolean;
    onClick: () => void;
  };
  children: React.ReactNode;
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStep)
  );
  const previousStep = steps[activeIndex - 1];
  const nextStep = steps[activeIndex + 1];
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto overscroll-contain bg-[#F6F3EE]">
      <div className="min-h-screen">
        <div className="sticky top-0 z-50 border-b border-black/5 bg-[#F6F3EE]/90 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  {eyebrow}
                </div>

                <h2 className="mt-2 text-4xl font-semibold tracking-tight">
                  {title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm"
                >
                  Cancelar
                </button>

                {secondaryAction && (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    disabled={secondaryAction.loading}
                    className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm disabled:opacity-50"
                  >
                    {secondaryAction.loading
                      ? secondaryAction.loadingLabel || "Guardando..."
                      : secondaryAction.label}
                  </button>
                )}

                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.loading}
                  className="rounded-full bg-black px-7 py-3 text-sm text-white disabled:opacity-50"
                >
                  {primaryAction.loading
                    ? primaryAction.loadingLabel || "Guardando..."
                    : primaryAction.label}
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {steps.map((step, index) => {
                const active = step.id === activeStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onStepChange(step.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white text-neutral-600 hover:border-black"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs">
                      {index + 1}
                    </span>
                    {step.label}
                  </button>
                );
              })}
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-black transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        {children}

        <div className="sticky bottom-0 z-40 border-t border-black/5 bg-[#F6F3EE]/90 px-6 py-4 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-neutral-500">
              Paso {activeIndex + 1} de {steps.length}:{" "}
              <span className="font-medium text-black">
                {steps[activeIndex]?.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!previousStep}
                onClick={() => previousStep && onStepChange(previousStep.id)}
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={!nextStep}
                onClick={() => nextStep && onStepChange(nextStep.id)}
                className="rounded-full bg-black px-6 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
