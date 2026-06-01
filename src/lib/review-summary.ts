type ReviewRow = {
  clinic_name?: string | null;
  specialist_name?: string | null;
  rating?: string | number | null;
};

export type ReviewSummary = {
  count: number;
  rating: string;
};

export function normalizeReviewKey(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function buildReviewSummaryMap(
  reviews: ReviewRow[],
  field: "clinic_name" | "specialist_name"
) {
  const ratingsByEntity = new Map<string, number[]>();

  reviews.forEach((review) => {
    const key = normalizeReviewKey(review[field]);
    const rating = Number(review.rating);

    if (!key || !Number.isFinite(rating)) return;

    const ratings = ratingsByEntity.get(key) || [];
    ratings.push(rating);
    ratingsByEntity.set(key, ratings);
  });

  return new Map<string, ReviewSummary>(
    Array.from(ratingsByEntity.entries()).map(([key, ratings]) => [
      key,
      {
        count: ratings.length,
        rating: (
          ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        ).toFixed(1),
      },
    ])
  );
}
