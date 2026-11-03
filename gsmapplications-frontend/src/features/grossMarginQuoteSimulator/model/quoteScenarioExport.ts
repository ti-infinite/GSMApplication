import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { QuoteOverrides, RecomputeInputs, SalesRowMode } from "./recompute";
import { getCurrentFieldValue } from "./recompute";
import { ratioOrNull, sumTreatingNullAsZero } from "@/entities/grossMarginSalesRow";

export interface QuoteScenarioExportEntry {
  name: string;
  savedAt: string; 
  mode: SalesRowMode;
  packQuantity: number;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
  row: SalesRow; 
  avgUnitPriceBase: number | null; 
  commissionType: "percent" | "value" | null;
}

export function buildQuoteRowValues(entry: QuoteScenarioExportEntry): (string | number | null)[] {
  const { row, inputs, overrides, avgUnitPriceBase, mode, packQuantity, commissionType } = entry;

  const field = (key: string) => getCurrentFieldValue(key, inputs, overrides, avgUnitPriceBase);

  const purchaseCost = field("purchaseCostOverride");
  const yieldVal = mode === "B" ? field("yieldOverride") : null;
  const rebate = field("rebateOverride");
  const listPrice = field("avgUnitPriceBaseOverride");
  const commissionPercent = commissionType === "percent" ? field("commissionPercentOverride") : null;
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
    null,
    null,
    null, // PACKAGING
    null, // LABOR TYPE
    null, // BOX TYPE
    row.Customer,
    purchaseCost,
    yieldVal,
    row.FinalPurPrice,
    null, // WASTE 
    labor,
    row.Packing,
    row.Sticker,
    null, // AD PACK
    row.Box,
    row.Transport,
    row.ExtraCosts ?? null,
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
