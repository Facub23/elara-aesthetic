"use client";

import { useState } from "react";

export default function ImageUpload({
  value,
  onChange,
  area = "marketplace",
}: {
  value: string;
  onChange: (url: string) => void;
  area?: "clinics" | "specialists" | "treatments" | "marketplace";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("area", area);

      const response = await fetch("/api/upload-admin-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error subiendo imagen");
        return;
      }

      onChange(data.url);
    } catch (error) {
      console.error("Upload catch error:", error);
      setError("Error inesperado subiendo imagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-black/10 bg-[#F8F5F1] transition-all duration-300 hover:border-black/30">
        {value ? (
          <img
            src={value}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-lg font-medium">
              {uploading ? "Subiendo..." : "Subir imagen"}
            </div>

            <div className="mt-2 text-sm text-neutral-500">
              JPG, PNG, WEBP
            </div>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
