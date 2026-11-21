/** Lowercase without accents: "Título" -> "titulo". */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** True when any field contains the query (accent- and case-insensitive). */
export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return fields.some((field) => field !== undefined && normalizeSearch(field).includes(q));
}
