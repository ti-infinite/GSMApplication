import { recomputeSalesRow } from "./recompute";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";

// Builds a starting point for a customer who isn't in db_ai.Sales yet.
// Cost-side fields are keyed by (Variety, Warehouse), so an existing
// customer's row is a valid template to copy as-is; AvgUnitPrice and
// Transport are customer-specific, so both get an averaged estimate instead.

export interface SyntheticBaselineResult {
  row: SalesRow;
  // Averaged from existing customers' TransportCostRow data for the same
  // Warehouse+package size, so "Negotiate Pallet Cost" has a real starting
  // number. null when there's nothing to average from.
  transportCost: TransportCostRow | null;
  templateRowCount: number;
  // Cost fields that disagreed across the template rows found, surfaced as
  // a warning instead of silently trusted (averaging them would fabricate
  // a number the pipeline itself never computes that way).
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

  // A starting point, not a quote: AvgUnitPrice averages what OTHER
  // customers already pay for this Variety+Warehouse, so the user has
  // something to anchor to instead of a blank price.
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

  // Reuse recomputeSalesRow (no overrides) rather than hand-rolling a second
  // copy of the cost formula here.
  const row = recomputeSalesRow({ baseline: partialRow, commission: null, rebate: null, transportCost }, {}).row;

  return { row, transportCost, templateRowCount: templateRows.length, costFieldsDisagree };
}

// A fully-blank starting point for a Variety+Warehouse with zero existing
// data -- every field starts null and the user fills them in by hand.
// CalculatedSKU/SKUMeasure are display-only placeholders; mixed-herb blends
// are out of scope (IsMixedHerbWholePack always 0).
export function buildManualBaseline(
  variety: string,
  warehouse: string,
  customerName: string,
  shapeTemplate: { measurementUnitValue: number; packQty: number | null; skuMeasure?: string }
): SalesRow {
  return {
    CalculatedSKU: `MANUAL-${variety}`,
    SKUMeasure: shapeTemplate.skuMeasure ?? `MANUAL-${variety}-${shapeTemplate.measurementUnitValue}`,
    Variety: variety,
    Customer: customerName,
    Warehouse: warehouse,
    AvgUnitPrice: null,
    CommissionApplied: 0,
    MeasurementUnitValue: shapeTemplate.measurementUnitValue,
    PackQty: shapeTemplate.packQty,
    PurchaseCost: null,
    Flag: null,
    Yield: null,
    FinalPurPrice: null,
    Packing: null,
    Sticker: null,
    Box: null,
    LabourProd: null,
    LabourRepack: null,
    LabourAssembler: null,
    Transport: null,
    IsMixedHerbWholePack: 0,
    FinalUnitCost: null,
    CostRatio: null,
    GrossMargin: null,
  };
}
