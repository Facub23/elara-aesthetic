"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function FavoriteSpecialistButton({
  specialistId,
}: {
  specialistId: string;
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
      } = await supabaseBrowser.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } =
        await supabaseBrowser
          .from("favorite_specialists")
          .select("id")
          .eq("user_id", user.id)
          .eq(
            "specialist_id",
            specialistId
          )
          .maybeSingle();

      setIsFavorite(Boolean(data));

      setLoading(false);
    }

    loadFavorite();
  }, [specialistId]);

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
      const { error } =
        await supabaseBrowser
          .from("favorite_specialists")
          .delete()
          .eq("user_id", userId)
          .eq(
            "specialist_id",
            specialistId
          );

      if (error) {
        setError("No pudimos quitar este especialista guardado.");

        setLoading(false);

        return;
      }

      setIsFavorite(false);

      setLoading(false);

      return;
    }

    const { error } =
      await supabaseBrowser
        .from("favorite_specialists")
        .insert({
          user_id: userId,
          specialist_id: specialistId,
        });

    if (error) {
      setError("No pudimos guardar este especialista.");

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
            ? "Especialista guardado"
            : "Guardar especialista"}
      </button>

      {error && (
        <p className="max-w-xs text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
