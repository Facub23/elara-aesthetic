export type TreatmentEntry =
  | string
  | {
      name?: string | null;
      price?: string | number | null;
      price_options?: TreatmentPriceOption[] | null;
      priceOptions?: TreatmentPriceOption[] | null;
      category?: string | null;
      duration_minutes?: string | number | null;
      durationMinutes?: string | number | null;
    };

export type TreatmentPriceOption = {
  label?: string | null;
  price?: string | number | null;
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

function parseNumericPrice(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.,]/g, "").replace(",", "."));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function parseNumericDuration(value: unknown) {
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

export function getTreatmentName(treatment?: TreatmentEntry | null) {
  return parseTreatmentEntry(treatment)?.name || "";
}

export function getTreatmentPriceValue(treatment?: TreatmentEntry | null) {
  const options = getTreatmentPriceOptions(treatment);

  if (options.length > 0) {
    return Math.min(...options.map((option) => option.price));
  }

  const value = parseTreatmentEntry(treatment)?.price;

  return parseNumericPrice(value);
}

export function getTreatmentRawPrice(treatment?: TreatmentEntry | null) {
  const value = parseTreatmentEntry(treatment)?.price;

  return value === null || value === undefined ? "" : String(value);
}

export function getTreatmentDurationValue(treatment?: TreatmentEntry | null) {
  const parsed = parseTreatmentEntry(treatment);
  const options = getTreatmentPriceOptions(treatment);

  if (options.length > 0) {
    const optionDurations = options
      .map((option) => option.duration_minutes)
      .filter((duration): duration is number => Boolean(duration));

    if (optionDurations.length > 0) {
      return Math.max(...optionDurations);
    }
  }

  const value = parsed?.duration_minutes ?? parsed?.durationMinutes;

  return parseNumericDuration(value);
}

export function getTreatmentRawDuration(treatment?: TreatmentEntry | null) {
  const parsed = parseTreatmentEntry(treatment);
  const value = parsed?.duration_minutes ?? parsed?.durationMinutes;

  return value === null || value === undefined ? "" : String(value);
}

export function getTreatmentCategory(treatment?: TreatmentEntry | null) {
  return parseTreatmentEntry(treatment)?.category || null;
}

export function getTreatmentPriceOptions(treatment?: TreatmentEntry | null) {
  const parsed = parseTreatmentEntry(treatment);
  const options = parsed?.price_options ?? parsed?.priceOptions;

  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      const label = String(option?.label || "").trim();
      const price = parseNumericPrice(option?.price);
      const duration = parseNumericDuration(
        option?.duration_minutes ?? option?.durationMinutes
      );

      if (!label || !price) {
        return null;
      }

      return {
        label,
        price,
        duration_minutes: duration,
        rawPrice: String(option.price || "").trim(),
      };
    })
    .filter(Boolean) as Array<{
      label: string;
      price: number;
      duration_minutes: number | null;
      rawPrice: string;
    }>;
}
