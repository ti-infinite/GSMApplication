// Mirrors db_ai.SupplierExtraCost (sql/18_supplier_extra_cost.sql).
// Identity is (Supplier, SKUCalculated, MeasureUnit) -- matches the exact
// join in sql/19_purchase_unit_landed.sql / 20_purchase_pound_landed.sql.
export interface ExtraCostRow {
  Id: number;
  Supplier: string;
  SKUCalculated: string;
  MeasureUnit: number;
  MIA: number | null;
  BOS: number | null;
  CHI: number | null;
  VIN: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}
