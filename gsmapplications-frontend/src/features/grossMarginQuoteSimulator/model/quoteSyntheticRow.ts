import { recomputeSalesRow } from "./recompute";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";

// Builds a starting point for a customer who isn't in db_ai.Sales yet --
// pure data assembly, no React. See dashboard/components/
// quote-simulator-new-customer-picker.tsx for the UI that calls this.
//
// Why this is safe: Flag, IsMixedHerbWholePack, and every db_ai.CostReference
// -derived field (PurchaseCost, Yield, Packing, Sticker, LabourProd,
// LabourRepack, LabourAssembler, Box, FinalPurPrice) are keyed by
// (Variety, Warehouse) in the SQL pipeline, never by Customer -- confirmed
// by tracing sql/15_sales.sql's Flag CTE (joins on SKU+Warehouse only) and
// db_ai.CostReference's own (Variety, Warehouse) key. So every existing
// customer's row for the same (Variety, Warehouse) already carries the
// exact cost-side numbers a brand-new customer would start from too -- no
// averaging needed there, just a template to copy. AvgUnitPrice (real sale
// history) and Transport (real pallet/case config) ARE genuinely customer-
// specific and a new customer has neither -- both get an averaged estimate
// from existing customers instead, same convention in both cases: a
// starting point to negotiate from, never presented as a real quote.

export interface SyntheticBaselineResult {
  row: SalesRow;
  // A synthetic estimate built by averaging existing customers' own
  // TransportCostRow data for the same Warehouse+package size -- lets the
  // "Negotiate Pallet Cost" toggle work with a real starting number instead
  // of being unavailable. null when there's nothing to average from.
  transportCost: TransportCostRow | null;
  templateRowCount: number;
  // Field names that, contrary to the "always identical across customers"
  // expectation above, actually disagreed across the existing rows found --
  // surfaced as a warning rather than silently trusted, since averaging a
  // cost-side field across customers would fabricate a number the pipeline
  // itself never computes that way.
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
    // Warehouse- and PackQty-filtered the same way sql/15_sales.sql's own
    // fallback reads Transport now (2026-08-07): prefer an exact match for
    // this specific warehouse/pack count, else fall back to a NULL
    // ("applies regardless of...") row -- a customer can now have more
    // than one DivisionTransportCost row per MeasurementUnitValue (Market
    // Basket varies by warehouse, Military Produce Group by pack count),
    // so this must not blend them together.
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

  // A starting point, not a quote: AvgUnitPrice is the average of what
  // OTHER customers already pay for this Variety+Warehouse -- same "average
  // across existing customers" convention as Transport/Pallet Cost above,
  // so the user isn't staring at a blank price with nothing to anchor to.
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

  // Reuse recomputeSalesRow itself (no overrides) to derive FinalUnitCost/
  // CostRatio/GrossMargin from the estimated price + copied cost fields --
  // one formula for "what does this total cost," not a second hand-rolled
  // copy of it living here.
  const row = recomputeSalesRow({ baseline: partialRow, commission: null, rebate: null, transportCost }, {}).row;

  return { row, transportCost, templateRowCount: templateRows.length, costFieldsDisagree };
}

// A fully-blank starting point for a Variety+Warehouse with ZERO existing
// data anywhere -- unlike buildSyntheticBaseline above, there's no template
// row to spread, so every price/cost field starts null and the user fills
// them in by hand (via the Inputs Panel's mode toggle, see
// quote-simulator-inputs-panel.tsx). Two distinct real-world cases share
// this one function: an existing Variety shipping from a warehouse it never
// has before (shapeTemplate sourced from that Variety's row at a DIFFERENT
// warehouse -- MeasurementUnitValue/PackQty are a property of the product,
// not the warehouse, so this is a safe default) vs. a Variety that's never
// been sold anywhere at all (shapeTemplate is whatever the user typed into
// the new-customer picker's own Measurement Unit Value / Pack Qty fields --
// see quote-simulator-new-customer-picker.tsx). Either way, by the time this
// is called, real values are already in hand -- this function never guesses
// a size on its own.
//
// CalculatedSKU/SKUMeasure are display-only placeholders here -- confirmed
// safe: the save-reference flow's POST bodies (costReferenceApi/yieldsApi/
// transportCostApi) only ever send Variety/Warehouse, never CalculatedSKU;
// the relay derives the real SKU server-side from Variety at save time (see
// yields-card.tsx's own comment on this). Mixed-herb blends are explicitly
// out of scope -- IsMixedHerbWholePack is always 0 here, since reconstructing
// a blend needs VarietyDesegregation child relationships this flow has no
// way to build inline.
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
