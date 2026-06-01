import { getSiteUrl } from "@/lib/site-url";

export function generateReviewLink(
  bookingId: string,
  reviewToken: string
) {
  return `${getSiteUrl()}/review/${bookingId}?token=${encodeURIComponent(reviewToken)}`;
}
