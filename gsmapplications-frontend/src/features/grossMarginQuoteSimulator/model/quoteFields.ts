import type { SalesRowMode } from "./recompute";
import { formatCurrency, formatPercent, formatNumber } from "@/shared/lib/format";


export type QuoteFieldTranslate = (labelKey: string) => string;

export interface QuoteFieldMeta {
  key: string; 
  label: string;
  labelKey: string;
  group: "price" | "cost";
  format: "currency" | "percent" | "number";
  step: string;
  supportsWholePackEntry?: boolean;
}

const DEFAULT_LABELS: Record<string, string> = {
  avgUnitPriceBase: "List price (before rebate and commission)",
  rebate: "Rebate",
  commissionValue: "Commission $",
  commissionPercent: "Commission %",
  transport: "Transport",
  transportWholePack: "Transport (whole pack)",
  extraCosts: "Extra costs",
  extraCostsWholePack: "Extra costs (whole pack)",
  purchaseCost: "Purchase cost",
  purchaseCostPerLb: "Purchase cost ($/lb)",
  box: "Box",
  boxWholePack: "Box (whole pack)",
  labourProd: "Labour (Prod)",
  labourRepack: "Labour (Repack)",
  labourAssembler: "Labour (Assembler)",
  yield: "Yield",
  packing: "Packing",
  sticker: "Sticker",
  mixedHerbFinalPurPrice: "Blended purchase cost (whole pack)",
  palletCost: "Pallet cost",
};

const englishLabel: QuoteFieldTranslate = (key) => DEFAULT_LABELS[key] ?? key;

export function getPriceFields(commissionType: "percent" | "value" | null, L: QuoteFieldTranslate = englishLabel): QuoteFieldMeta[] {
  const fields: QuoteFieldMeta[] = [
    { key: "avgUnitPriceBaseOverride", label: L("avgUnitPriceBase"), labelKey: "avgUnitPriceBase", group: "price", format: "currency", step: "0.001" },
    { key: "rebateOverride", label: L("rebate"), labelKey: "rebate", group: "price", format: "currency", step: "0.001" },
  ];
  if (commissionType === "value") {
    fields.push({ key: "commissionValueOverride", label: L("commissionValue"), labelKey: "commissionValue", group: "price", format: "currency", step: "0.001" });
  } else {
    fields.push({ key: "commissionPercentOverride", label: L("commissionPercent"), labelKey: "commissionPercent", group: "price", format: "percent", step: "0.001" });
  }
  return fields;
}

export function decimalPlaces(step: string): number {
  const idx = step.indexOf(".");
  return idx === -1 ? 0 : step.length - idx - 1;
}


export function validateFieldValue(key: string, value: number): string | null {
  if (key === "commissionPercentOverride") {
    if (value < 0 || value >= 1) return "commissionRange";
    return null;
  }
  if (key === "yieldOverride") {
    if (value <= 0) return "yieldPositive";
    return null;
  }
  if (value < 0) return "nonNegative";
  return null;
}


export function getCostFields(mode: SalesRowMode, L: QuoteFieldTranslate = englishLabel): QuoteFieldMeta[] {
  const wholePackEligibleTransport: QuoteFieldMeta = {
    key: "transportOverride",
    label: L("transport"), labelKey: "transport",
    group: "cost",
    format: "currency",
    step: "0.001",
    supportsWholePackEntry: true,
  };
  const wholePackTransport: QuoteFieldMeta = {
    key: "transportOverride",
    label: L("transportWholePack"), labelKey: "transportWholePack",
    group: "cost",
    format: "currency",
    step: "0.001",
  };
  
  const extraCosts: QuoteFieldMeta = {
    key: "extraCostsOverride",
    label: L("extraCosts"), labelKey: "extraCosts",
    group: "cost",
    format: "currency",
    step: "0.001",
    supportsWholePackEntry: true,
  };
  const wholePackExtraCosts: QuoteFieldMeta = {
    key: "extraCostsOverride",
    label: L("extraCostsWholePack"), labelKey: "extraCostsWholePack",
    group: "cost",
    format: "currency",
    step: "0.001",
  };

  if (mode === "A") {
    return [
      { key: "purchaseCostOverride", label: L("purchaseCost"), labelKey: "purchaseCost", group: "cost", format: "currency", step: "0.001" },
      { key: "boxOverride", label: L("box"), labelKey: "box", group: "cost", format: "currency", step: "0.001", supportsWholePackEntry: true },
      { key: "labourRepackOverride", label: L("labourRepack"), labelKey: "labourRepack", group: "cost", format: "currency", step: "0.001" },
      { key: "labourAssemblerOverride", label: L("labourAssembler"), labelKey: "labourAssembler", group: "cost", format: "currency", step: "0.001" },
      wholePackEligibleTransport,
      extraCosts,
    ];
  }
  if (mode === "B") {
    return [
      { key: "purchaseCostOverride", label: L("purchaseCostPerLb"), labelKey: "purchaseCostPerLb", group: "cost", format: "currency", step: "0.001" },
      { key: "yieldOverride", label: L("yield"), labelKey: "yield", group: "cost", format: "number", step: "0.1" },
      { key: "packingOverride", label: L("packing"), labelKey: "packing", group: "cost", format: "currency", step: "0.001" },
      { key: "stickerOverride", label: L("sticker"), labelKey: "sticker", group: "cost", format: "currency", step: "0.001" },
      { key: "labourProdOverride", label: L("labourProd"), labelKey: "labourProd", group: "cost", format: "currency", step: "0.001" },
      // Mode B also gets LabourRepack from CostReference, matching recompute.ts.
      { key: "labourRepackOverride", label: L("labourRepack"), labelKey: "labourRepack", group: "cost", format: "currency", step: "0.001" },
      { key: "boxOverride", label: L("box"), labelKey: "box", group: "cost", format: "currency", step: "0.001", supportsWholePackEntry: true },
      { key: "labourAssemblerOverride", label: L("labourAssembler"), labelKey: "labourAssembler", group: "cost", format: "currency", step: "0.001" },
      wholePackEligibleTransport,
      extraCosts,
    ];
  }
  if (mode === "C") {
    return [
      { key: "mixedHerbFinalPurPriceOverride", label: L("mixedHerbFinalPurPrice"), labelKey: "mixedHerbFinalPurPrice", group: "cost", format: "currency", step: "0.001" },
      { key: "boxOverride", label: L("boxWholePack"), labelKey: "boxWholePack", group: "cost", format: "currency", step: "0.001" },
      wholePackTransport,
      wholePackExtraCosts,
    ];
  }
  return [];
}

export function excludingPalletNegotiatedTransport(
  fields: QuoteFieldMeta[],
  transportMode: "direct" | "pallet"
): QuoteFieldMeta[] {
  return fields.filter((f) => !(f.key === "transportOverride" && transportMode === "pallet"));
}

export function getCostFieldsForTransportMode(
  mode: SalesRowMode,
  transportMode: "direct" | "pallet",
  canNegotiatePallet: boolean,
  L: QuoteFieldTranslate = englishLabel
): QuoteFieldMeta[] {
  const fields = excludingPalletNegotiatedTransport(getCostFields(mode, L), transportMode);
  if (transportMode === "pallet" && canNegotiatePallet) {
    fields.push({ key: "palletCostOverride", label: L("palletCost"), labelKey: "palletCost", group: "cost", format: "currency", step: "0.01" });
  }
  return fields;
}


export function formatByFieldFormat(format: QuoteFieldMeta["format"], value: number | null): string {
  if (format === "percent") return formatPercent(value);
  if (format === "number") return formatNumber(value);
  return formatCurrency(value);
}
