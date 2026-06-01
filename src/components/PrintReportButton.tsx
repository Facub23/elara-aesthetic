"use client";

export default function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-black px-6 py-3 text-white print:hidden"
    >
      Descargar PDF
    </button>
  );
}