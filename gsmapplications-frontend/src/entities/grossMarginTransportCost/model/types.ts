// Mirrors db_ai.DivisionTransportCost (sql/21_division_transport_cost.sql).
// Identity is (DivisionName, MeasurementUnitValue, Warehouse) -- the actual
// Sales join key, narrower than the source Excel's natural key.
// UnitsXPallet/TransportUnitCost are derived PERSISTED columns; Warehouse/
// PackQty NULL means "applies regardless of" that field.
export interface TransportCostRow {
  Id: number;
  DivisionName: string;
  Type: string | null;
  Packaging: string | null;
  MeasurementUnitValue: number;
  Qty: number | null;
  BoxesXPallet: number | null;
  UnitsXPallet: number | null;
  PalletCost: number | null;
  TransportUnitCost: number | null;
  Warehouse: string | null;
  PackQty: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}
