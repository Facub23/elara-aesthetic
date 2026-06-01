"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function FavoriteClinicButton({
  clinicId,
  clinicName,
  clinicSlug,
  clinicLocation,
}: {
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  clinicLocation?: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFavorite() {
      const {
        data: { user },
      } =
        await supabaseBrowser.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } =
        await supabaseBrowser
          .from("favorite_clinics")
          .select("id")
          .eq("user_id", user.id)
          .eq("clinic_id", clinicId)
          .maybeSingle();

      if (data) {
        setIsFavorite(true);
        setLoading(false);
        return;
      }

      const { data: favoriteBySlug } =
        await supabaseBrowser
          .from("favorite_clinics")
          .select("id")
          .eq("user_id", user.id)
          .eq("clinic_slug", clinicSlug)
          .maybeSingle();

      setIsFavorite(Boolean(favoriteBySlug));

      setLoading(false);
    }

    loadFavorite();
  }, [clinicSlug]);

  async function toggleFavorite() {
    setError("");

    if (!userId) {
      window.location.href = `/mi-cuenta?next=${encodeURIComponent(
        window.location.pathname + window.location.search
      )}`;
      return;
    }

    setLoading(true);

    if (isFavorite) {
      const { error: idError } =
        await supabaseBrowser
          .from("favorite_clinics")
          .delete()
          .eq("user_id", userId)
          .eq("clinic_id", clinicId);

      const { error: slugError } =
        await supabaseBrowser
          .from("favorite_clinics")
          .delete()
          .eq("user_id", userId)
          .eq("clinic_slug", clinicSlug);

      if (idError || slugError) {
        setError(
          idError?.message ||
            slugError?.message ||
            "No pudimos quitar la clinica guardada."
        );
        setLoading(false);
        return;
      }

      setIsFavorite(false);
      setLoading(false);
      return;
    }

    const { error } =
      await supabaseBrowser
        .from("favorite_clinics")
        .insert({
          user_id: userId,
          clinic_id: clinicId,
          clinic_name: clinicName,
          clinic_slug: clinicSlug,
          clinic_location:
            clinicLocation || "",
        });

    if (error) {
      setError(error.message || "No pudimos guardar esta clinica.");
      setLoading(false);
      return;
    }

    setIsFavorite(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={loading}
        aria-pressed={isFavorite}
        className="rounded-full border border-black/10 bg-white/80 px-6 py-3 text-sm backdrop-blur-xl transition hover:bg-black hover:text-white disabled:opacity-50"
      >
        {loading
          ? "Actualizando..."
          : isFavorite
            ? "Clinica guardada"
            : "Guardar clinica"}
      </button>

      {error && (
        <p className="max-w-xs text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
