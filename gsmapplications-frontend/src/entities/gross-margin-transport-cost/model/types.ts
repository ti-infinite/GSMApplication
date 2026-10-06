// Mirrors db_ai.DivisionTransportCost (sql/21_division_transport_cost.sql).
// Identity is (DivisionName, MeasurementUnitValue, Warehouse) -- the ACTUAL
// Sales join key, narrower than the source Excel's own Type/Packaging-
// inclusive natural key. UnitsXPallet/TransportUnitCost are real SQL Server
// PERSISTED computed columns -- always derived, never sent on write.
// Warehouse (2026-08-07): NULL means "applies regardless of warehouse" --
// every division's real behavior before Market Basket, the first customer
// genuinely fulfilled from more than one warehouse for the same product.
// PackQty (2026-08-07, same day): NULL means "applies regardless of pack
// count" -- distinguishes e.g. a "0.5 OZ 3 PK" from a "0.5 OZ 6 PK" of the
// same herb (same MeasurementUnitValue, different physical box/pallet
// config), first needed by Military Produce Group.
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
