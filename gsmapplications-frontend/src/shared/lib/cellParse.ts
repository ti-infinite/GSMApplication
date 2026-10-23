// Generic Excel-cell parsing primitives -- no business logic, reusable by
// any entity's bulk-upload schema (see entities/<name>/api/bulk.ts).
// Extracted out of the old lib/reference-schemas.ts.
export function cellToText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function cellToNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : NaN; // NaN signals "present but not a valid number"
}
