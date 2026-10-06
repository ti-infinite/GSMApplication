import type { SalesRow } from "@/entities/gross-margin-sales-row";

// CalculatedSKU is always exactly Class(1) + Type(1) + Herb(4) -- verified
// live against all 836 rows in db_ai.Sales at the time (zero exceptions,
// including mixed-herb blends). Class/Type are a small fixed vocabulary;
// Herb is a flat ~160-value enum NHUBEX assigns with no predictable naming
// rule, so it's derived from real data rather than hardcoded here.
export interface CodeOption {
  code: string;
  label: string;
}

export const SKU_CLASSES: CodeOption[] = [
  { code: "C", label: "Conventional" },
  { code: "O", label: "Organic" },
];

// R is overwhelmingly the common case (regular cut herbs) -- Potted/Specialty
// are real but minority categories (confirmed live: 738/168/33 split).
export const SKU_TYPES: CodeOption[] = [
  { code: "R", label: "Regular" },
  { code: "P", label: "Potted" },
  { code: "S", label: "Specialty" },
];

const HERB_CODE_LENGTH = 4;
const PREFIX_LENGTH = 2; // Class + Type

// Every real Herb code already in use, with a human-readable label pulled
// from the first Variety name that uses it (the text before " - ", the same
// "herb name" fragment every existing Variety string already starts with).
// Purely derived from data already loaded client-side -- no new endpoint.
export function buildKnownHerbCodes(rows: SalesRow[]): CodeOption[] {
  const byCode = new Map<string, string>();
  for (const row of rows) {
    const sku = row.CalculatedSKU;
    if (!sku || sku.length !== PREFIX_LENGTH + HERB_CODE_LENGTH) continue;
    const herbCode = sku.slice(PREFIX_LENGTH);
    if (byCode.has(herbCode)) continue;
    const label = row.Variety.split(" - ")[0]?.trim() || row.Variety;
    byCode.set(herbCode, label);
  }
  return Array.from(byCode.entries())
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
