"use client";

import { useState } from "react";

export default function ClinicImageUploader({
  onUpload,
}: {
  onUpload: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function uploadImage(file: File) {
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("area", "clinics");
    const response = await fetch("/api/upload-admin-image", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      window.dispatchEvent(
  new CustomEvent(
    "admin-toast",
    {
      detail: {
        message:
          "Error subiendo imagen",
        type: "error",
      },
    }
  )
);
      setLoading(false);
      return;
    }

    onUpload(data.url);
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-dashed border-black/20 bg-[#F7F5F2] p-5">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
        }}
      />

      <div className="mt-3 text-sm text-neutral-500">
        {loading ? "Subiendo imagen..." : "Subir imagen de clínica"}
      </div>
    </div>
  );
}
