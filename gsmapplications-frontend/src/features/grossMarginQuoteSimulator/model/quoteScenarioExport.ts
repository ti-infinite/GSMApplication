// The actual workbook building happens server-side (relay, bulk_export.py).
// This resolves each saved scenario's "current effective value" per column,
// matching the reference "QUOTE" sheet's column layout, and the caller
// sends the resolved values array straight to the relay.

import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { QuoteOverrides, RecomputeInputs, SalesRowMode } from "./recompute";
import { getCurrentFieldValue } from "./recompute";
import { ratioOrNull, sumTreatingNullAsZero } from "@/entities/grossMarginSalesRow";

export interface QuoteScenarioExportEntry {
  name: string;
  savedAt: string; // ISO 8601
  mode: SalesRowMode;
  packQuantity: number;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
  row: SalesRow; // recomputeSalesRow(inputs, overrides).row -- already resolved
  avgUnitPriceBase: number | null; // recomputeSalesRow(...).avgUnitPriceBase, needed to resolve Rebate/Commission fields
  commissionType: "percent" | "value" | null;
}

// Column order matches gross-margin-relay/bulk_export.py's QUOTE_COLUMNS
// exactly -- change one, change the other.
export function buildQuoteRowValues(entry: QuoteScenarioExportEntry): (string | number | null)[] {
  const { row, inputs, overrides, avgUnitPriceBase, mode, packQuantity, commissionType } = entry;

  const field = (key: string) => getCurrentFieldValue(key, inputs, overrides, avgUnitPriceBase);

  const purchaseCost = field("purchaseCostOverride");
  const yieldVal = mode === "B" ? field("yieldOverride") : null;
  const rebate = field("rebateOverride");
  const listPrice = field("avgUnitPriceBaseOverride");
  const commissionPercent = commissionType === "percent" ? field("commissionPercentOverride") : null;
  // Residual between the Rebate-adjusted List Price and the final net
  // AvgUnitPrice -- correct regardless of commission type (value or
  // percent) without re-deriving recomputeAvgUnitPrice's own branching
  // as a second formula.
  const commissionAmount =
    listPrice !== null && rebate !== null && row.AvgUnitPrice !== null
      ? listPrice - rebate - row.AvgUnitPrice
      : null;
  const labor = sumTreatingNullAsZero(row.LabourProd, row.LabourRepack, row.LabourAssembler);
  const packagingCost = sumTreatingNullAsZero(row.Packing, row.Sticker, row.Box);
  const wholePackPrice = row.AvgUnitPrice !== null ? row.AvgUnitPrice * packQuantity : null;

  return [
    row.Warehouse,
    row.MeasurementUnitValue,
    packQuantity,
    row.Variety,
    null, // CLASS -- not tracked as a separate field
    null, // TYPE
    null, // PACKAGING
    null, // LABOR TYPE
    null, // BOX TYPE
    row.Customer,
    purchaseCost,
    yieldVal,
    row.FinalPurPrice,
    null, // WASTE -- no equivalent field
    labor,
    row.Packing,
    row.Sticker,
    null, // AD PACK
    row.Box,
    row.Transport,
    rebate,
    commissionAmount,
    commissionPercent,
    row.GrossMargin,
    wholePackPrice,
    wholePackPrice,
    row.GrossMargin,
    wholePackPrice,
    row.GrossMargin,
    null, // FOB PRICE -- no equivalent, optional future addition
    ratioOrNull(row.FinalPurPrice, row.AvgUnitPrice),
    ratioOrNull(labor, row.AvgUnitPrice),
    ratioOrNull(packagingCost, row.AvgUnitPrice),
    ratioOrNull(row.Transport, row.AvgUnitPrice),
  ];
}
