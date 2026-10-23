import { recomputeSalesRow } from "./recompute";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import type { PurchaseCostLookup } from "../api/fetchPurchaseCost";
import type { QuoteCostEstimates } from "./quoteCostEstimates";



export interface SyntheticBaselineResult {
  row: SalesRow;

  transportCost: TransportCostRow | null;
  templateRowCount: number;

  costFieldsDisagree: string[];
}

const COST_FIELDS: (keyof SalesRow)[] = [
  "CalculatedSKU",
  "SKUMeasure",
  "MeasurementUnitValue",
  "PackQty",
  "PurchaseCost",
  "Flag",
  "Yield",
  "FinalPurPrice",
  "Packing",
  "Sticker",
  "Box",
  "LabourProd",
  "LabourRepack",
  "LabourAssembler",
  "IsMixedHerbWholePack",
];

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function findDisagreements(templateRows: SalesRow[]): string[] {
  const first = templateRows[0];
  return COST_FIELDS.filter((field) => !templateRows.every((r) => r[field] === first[field]));
}

export function buildSyntheticBaseline(
  variety: string,
  warehouse: string,
  customerName: string,
  existingRows: SalesRow[],
  transportCosts: TransportCostRow[]
): SyntheticBaselineResult | null {
  const templateRows = existingRows.filter((r) => r.Variety === variety && r.Warehouse === warehouse);
  if (templateRows.length === 0) return null;

  const template = templateRows[0];
  const costFieldsDisagree = findDisagreements(templateRows);

  let transportCost: TransportCostRow | null = null;
  if (template.MeasurementUnitValue !== null) {
    // Prefer an exact warehouse/pack-count match, else fall back to a NULL
    // ("applies regardless of...") row -- a customer can have more than one
    // DivisionTransportCost row per MeasurementUnitValue, so these must not
    // be blended together.
    const matching = transportCosts.filter(
      (t) =>
        t.MeasurementUnitValue === template.MeasurementUnitValue &&
        templateRows.some((r) => r.Customer === t.DivisionName) &&
        (t.Warehouse === warehouse || t.Warehouse === null) &&
        (t.PackQty === template.PackQty || t.PackQty === null)
    );
    if (matching.length > 0) {
      transportCost = {
        Id: 0,
        DivisionName: customerName,
        Type: null,
        Packaging: null,
        MeasurementUnitValue: template.MeasurementUnitValue,
        Qty: average(matching.map((t) => t.Qty)),
        BoxesXPallet: average(matching.map((t) => t.BoxesXPallet)),
        UnitsXPallet: average(matching.map((t) => t.UnitsXPallet)),
        PalletCost: average(matching.map((t) => t.PalletCost)),
        TransportUnitCost: average(matching.map((t) => t.TransportUnitCost)),
        Warehouse: warehouse,
        PackQty: template.PackQty,
        CreatedAt: "",
        UpdatedAt: "",
      };
    }
  }


  const partialRow: SalesRow = {
    ...template,
    Customer: customerName,
    AvgUnitPrice: average(templateRows.map((r) => r.AvgUnitPrice)),
    Transport: average(templateRows.map((r) => r.Transport)),
    CommissionApplied: 0,
    FinalUnitCost: null,
    CostRatio: null,
    GrossMargin: null,
  };


  const row = recomputeSalesRow({ baseline: partialRow, commission: null, rebate: null, transportCost }, {}).row;

  return { row, transportCost, templateRowCount: templateRows.length, costFieldsDisagree };
}


export const MANUAL_SKU_PREFIX = "MANUAL-";
export const isManualSku = (sku: string) => sku.startsWith(MANUAL_SKU_PREFIX);

// Mirrors how the sales data derives SKUMeasure from a product code and its
// unit value: "CRBASI" + 16 -> "CRBASI16.0000" (always four decimals).
export function buildSkuMeasure(calculatedSku: string, measurementUnitValue: number): string {
  return `${calculatedSku}${measurementUnitValue.toFixed(4)}`;
}


export function buildManualBaseline(
  variety: string,
  warehouse: string,
  customerName: string,
  shapeTemplate: { measurementUnitValue: number; packQty: number | null; skuMeasure?: string; calculatedSku?: string | null },
  purchaseCostLookup: PurchaseCostLookup = { flag: null, purchaseCost: null },
 
  estimates?: QuoteCostEstimates | null
): SalesRow {
  const calculatedSku = shapeTemplate.calculatedSku ?? `${MANUAL_SKU_PREFIX}${variety}`;
  const skuMeasure =
    shapeTemplate.skuMeasure ??
    (shapeTemplate.calculatedSku
      ? buildSkuMeasure(calculatedSku, shapeTemplate.measurementUnitValue)
      : `${MANUAL_SKU_PREFIX}${variety}-${shapeTemplate.measurementUnitValue}`);
  const lookupHit = purchaseCostLookup.purchaseCost !== null;
  const purchaseCost = lookupHit ? purchaseCostLookup.purchaseCost : (estimates?.purchaseCost.value ?? null);
  const flag = lookupHit ? purchaseCostLookup.flag : (estimates?.purchaseCost.flag ?? purchaseCostLookup.flag);
  const blank: SalesRow = {
    CalculatedSKU: calculatedSku,
    SKUMeasure: skuMeasure,
    Variety: variety,
    Customer: customerName,
    Warehouse: warehouse,
    AvgUnitPrice: null,
    CommissionApplied: 0,
    MeasurementUnitValue: shapeTemplate.measurementUnitValue,
    PackQty: shapeTemplate.packQty,
    PurchaseCost: purchaseCost,
    Flag: flag,
    Yield: estimates?.yield.value ?? null,
    FinalPurPrice: null,
    Packing: estimates?.packing.value ?? null,
    Sticker: estimates?.sticker.value ?? null,
    Box: estimates?.box.value ?? null,
    LabourProd: estimates?.labourProd.value ?? null,
    LabourRepack: estimates?.labourRepack.value ?? null,
    LabourAssembler: estimates?.labourAssembler.value ?? null,
    Transport: estimates?.transport.value ?? null,
    IsMixedHerbWholePack: 0,
    FinalUnitCost: null,
    CostRatio: null,
    GrossMargin: null,
  };
  if (!estimates) return blank;
  return recomputeSalesRow({ baseline: blank, commission: null, rebate: null, transportCost: null }, {}).row;
}
