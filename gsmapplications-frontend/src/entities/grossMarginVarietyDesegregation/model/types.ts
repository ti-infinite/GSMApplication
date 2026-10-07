// Mirrors db_ai.VarietyDesegregation (sql/23_variety_desegregation.sql).
// Identity is (ParentVariety, ChildVariety) -- one row per single-herb
// component of a blend, e.g. (MIXED HERBS - ... 32 CT Conventional,
// ROSEMARY - CLAMSHELL 0.5 OZ Conventional, 12). Consumed by
// sql/15_sales.sql to reconstruct a purchase cost for the "MIXED HERBS"
// and "POULTRY - BLEND" varieties (see IsMixedHerbWholePack on SalesRow).
// Factor (2026-08-10): 1 for every Mixed Herbs row (a no-op -- preserves
// the original Quantity-only formula exactly), 1/3 for each Poultry
// child -- Poultry has no natural count, always an equal weight-split.
export interface VarietyDesegregationRow {
  Id: number;
  ParentVariety: string;
  ChildVariety: string;
  Quantity: number;
  Factor: number;
  CreatedAt: string;
  UpdatedAt: string;
}
