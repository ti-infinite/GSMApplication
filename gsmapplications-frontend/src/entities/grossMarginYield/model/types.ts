// Mirrors db_ai.Yields (sql/14_yields.sql). CalculatedSKU is the identity
// (derived server-side from a Variety on create, never typed by hand).
export interface YieldRow {
  Id: number;
  CalculatedSKU: string;
  Yield: number;
  CreatedAt: string;
  UpdatedAt: string;
}
