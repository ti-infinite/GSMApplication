// Mirrors db_ai.VarietyDesegregation (sql/23_variety_desegregation.sql).
// Identity is (ParentVariety, ChildVariety) -- one row per single-herb
// component of a blend, consumed by sql/15_sales.sql to reconstruct
// purchase cost for "MIXED HERBS" and "POULTRY - BLEND" varieties. Factor
// is 1 (no-op) for Mixed Herbs, 1/3 per Poultry child (even weight-split).
export interface VarietyDesegregationRow {
  Id: number;
  ParentVariety: string;
  ChildVariety: string;
  Quantity: number;
  Factor: number;
  CreatedAt: string;
  UpdatedAt: string;
}
