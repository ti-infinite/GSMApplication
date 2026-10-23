// Mirrors db_ai.CostReference (sql/16_cost_reference.sql). Identity is
// (Variety, Warehouse) -- the real Sales join key; CalculatedSKU is
// informational-only and may be null if it couldn't be auto-derived.
export interface CostReferenceRow {
  Id: number;
  CalculatedSKU: string | null;
  Variety: string;
  Warehouse: string;
  Packing: number | null;
  Sticker: number | null;
  Box: number | null;
  LabourProd: number | null;
  LabourRepack: number | null;
  LabourAssembler: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}
