type PublicRecord = {
  name?: string | null;
  slug?: string | null;
  title?: string | null;
  specialty?: string | null;
  clinic_name?: string | null;
  specialist_name?: string | null;
  patient_name?: string | null;
  treatment?: string | null;
  review?: string | null;
  email?: string | null;
};

function normalizePublicText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isPublicPlaceholderRecord(record?: PublicRecord | null) {
  if (!record) {
    return false;
  }

  const text = [
    record.name,
    record.slug,
    record.title,
    record.specialty,
    record.clinic_name,
    record.specialist_name,
    record.patient_name,
    record.treatment,
    record.review,
    record.email,
  ]
    .map(normalizePublicText)
    .filter(Boolean)
    .join(" ");

  return /\b(prueba|test|qa|demo)\b/.test(text);
}

export function filterPublicRecords<T extends PublicRecord>(records?: T[] | null) {
  return (records || []).filter((record) => !isPublicPlaceholderRecord(record));
}
