export type TreatmentEntry =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
      category?: string | null;
      duration_minutes?: string | number | null;
      durationMinutes?: string | number | null;
    };

export function parseTreatmentEntry(treatment?: TreatmentEntry | null) {
  if (!treatment) {
    return null;
  }

  if (typeof treatment === "string") {
    const trimmed = treatment.trim();

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);

        if (parsed && typeof parsed === "object") {
          return parsed as Exclude<TreatmentEntry, string>;
        }
      } catch {
        return {
          name: trimmed,
        };
      }
    }

    return {
      name: trimmed,
    };
  }

  return treatment;
}

export function getTreatmentName(treatment?: TreatmentEntry | null) {
  return parseTreatmentEntry(treatment)?.name || "";
}

export function getTreatmentPriceValue(treatment?: TreatmentEntry | null) {
  const value = parseTreatmentEntry(treatment)?.price;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.,]/g, "").replace(",", "."));

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getTreatmentRawPrice(treatment?: TreatmentEntry | null) {
  const value = parseTreatmentEntry(treatment)?.price;

  return value === null || value === undefined ? "" : String(value);
}

export function getTreatmentDurationValue(treatment?: TreatmentEntry | null) {
  const parsed = parseTreatmentEntry(treatment);
  const value = parsed?.duration_minutes ?? parsed?.durationMinutes;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9]/g, ""));

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

export function getTreatmentRawDuration(treatment?: TreatmentEntry | null) {
  const parsed = parseTreatmentEntry(treatment);
  const value = parsed?.duration_minutes ?? parsed?.durationMinutes;

  return value === null || value === undefined ? "" : String(value);
}

export function getTreatmentCategory(treatment?: TreatmentEntry | null) {
  return parseTreatmentEntry(treatment)?.category || null;
}
