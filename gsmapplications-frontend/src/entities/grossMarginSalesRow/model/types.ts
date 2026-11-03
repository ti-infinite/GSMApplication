export interface SalesRow {
  CalculatedSKU: string;
  SKUMeasure: string;
  Variety: string;
  Customer: string;
  Warehouse: string;
  AvgUnitPrice: number | null;
  CommissionApplied: 0 | 1;
  MeasurementUnitValue: number | null;
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
  ExtraCosts?: number | null;
  IsMixedHerbWholePack: 0 | 1;
  FinalUnitCost: number | null;
  CostRatio: number | null;
  GrossMargin: number | null;
}
