export function getAddressLines(value?: string | null) {
  return String(value || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getPrimaryAddress(value?: string | null) {
  return getAddressLines(value)[0] || "";
}

export function getAddressSearchText(value?: string | null) {
  return getAddressLines(value).join(" ");
}

export function getAddressCities(value?: string | null) {
  return Array.from(
    new Set(
      getAddressLines(value)
        .map((line) => {
          const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
          return parts.length > 1 ? parts.at(-1) : "";
        })
        .filter(Boolean)
    )
  );
}

export function getLocationSummary({
  location,
  city,
  country,
}: {
  location?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  return getPrimaryAddress(location) || [city, country].filter(Boolean).join(", ");
}
