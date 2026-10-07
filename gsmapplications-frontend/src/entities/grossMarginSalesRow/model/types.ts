// Mirrors db_ai.Sales exactly (see gross-margin-pipeline/sql/15_sales.sql).
// Nullable columns reflect real "not yet gathered" data -- never coerce these
// to 0 anywhere outside model/alarms.ts's documented FinalUnitCost convention.
export interface SalesRow {
  CalculatedSKU: string;
  SKUMeasure: string;
  Variety: string;
  Customer: string;
  Warehouse: string;
  AvgUnitPrice: number | null;
  CommissionApplied: 0 | 1;
  MeasurementUnitValue: number | null;
  // 2026-07-28: the variety's real case size (MasterVarieties.Qty, e.g. 6
  // for a "6 PK" Basil). Per-single-unit for non-mixed-herb rows (every
  // dollar figure on those rows is PER UNIT, so multiply by PackQty to get
  // a case/pack price); informational only for mixed-herb rows, whose
  // dollar figures are already whole-pack totals (see IsMixedHerbWholePack).
  PackQty: number | null;
  PurchaseCost: number | null;
  Flag: 0 | 1 | null;
  Yield: number | null;
  FinalPurPrice: number | null;
  Packing: number | null;
  Sticker: number | null;
  Box: number | null;
  LabourProd: number | null;
  LabourRepack: number | null;
  LabourAssembler: number | null;
  Transport: number | null;
  // 2026-07-24: mixed-herb rows only. When 1, every dollar figure on this
  // row (AvgUnitPrice, FinalPurPrice, Box, Transport, FinalUnitCost) is a
  // WHOLE-PACK total (e.g. the cost/price of the entire "32 CT" batch),
  // not a per-unit figure like every other row -- drives the dashboard's
  // "whole-pack total" disclaimer.
  IsMixedHerbWholePack: 0 | 1;
  FinalUnitCost: number | null;
  CostRatio: number | null;
  GrossMargin: number | null;
}
