import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import { ratioOrNull, sumTreatingNullAsZero } from "@/entities/grossMarginSalesRow";
import { THRESHOLDS } from "@/shared/lib/thresholds";

export type SalesRowMode = "A" | "B" | "C" | "none";

export function getSalesRowMode(row: SalesRow): SalesRowMode {
  if (row.IsMixedHerbWholePack === 1) return "C";
  if (row.Flag === 1) return "A";
  if (row.Flag === 0) return "B";
  return "none";
}

export interface QuoteOverrides {
  avgUnitPriceBaseOverride?: number; 
  rebateOverride?: number; 
  commissionPercentOverride?: number; 
  commissionValueOverride?: number;

  // Cost side -- Mode A.
  purchaseCostOverride?: number; // = FinalPurPrice directly, no Yield involved
  labourRepackOverride?: number;

  // Cost side -- Mode B. purchaseCostOverride is reused here as the raw $/lb price.
  yieldOverride?: number;
  packingOverride?: number;
  stickerOverride?: number;
  labourProdOverride?: number;

  // Cost side -- shared by A/B/C.
  boxOverride?: number;
  labourAssemblerOverride?: number; // A/B only -- Mode C's is folded into FinalPurPrice already
  transportOverride?: number;
  palletCostOverride?: number;
  extraCostsOverride?: number;
  mixedHerbFinalPurPriceOverride?: number;
}

export interface RecomputeInputs {
  baseline: SalesRow;
  commission: CommissionRow | null; 
  rebate: RebateRow | null; 
  transportCost: TransportCostRow | null; 
}

export interface RecomputeResult {
  row: SalesRow;
  mode: SalesRowMode;
  avgUnitPriceBase: number | null;
  transportUnitCostUsed: number | null;
  warnings: string[];
}

function reconstructAvgUnitPriceBase(
  baseline: SalesRow,
  commission: CommissionRow | null,
  rebate: RebateRow | null
): number | null {
  if (baseline.AvgUnitPrice === null) return null;
  let afterRebate = baseline.AvgUnitPrice;
  if (commission) {
    if (commission.CommissionType === "value") {
      afterRebate = baseline.AvgUnitPrice + commission.CommissionAmount;
    } else if (commission.CommissionType === "percent") {
      const denom = 1 - commission.CommissionAmount;
      afterRebate = denom !== 0 ? baseline.AvgUnitPrice / denom : baseline.AvgUnitPrice;
    }
  }
  return afterRebate + (rebate?.Rebate ?? 0);
}

function recomputeAvgUnitPrice(
  avgUnitPriceBase: number | null,
  commission: CommissionRow | null,
  rebate: RebateRow | null,
  overrides: QuoteOverrides
): number | null {
  const base = overrides.avgUnitPriceBaseOverride ?? avgUnitPriceBase;
  if (base === null) return null;

  const rebateAmount = overrides.rebateOverride ?? rebate?.Rebate ?? 0;
  const afterRebate = base - rebateAmount;

  const commissionType =
    commission?.CommissionType ??
    (overrides.commissionValueOverride !== undefined
      ? "value"
      : overrides.commissionPercentOverride !== undefined
        ? "percent"
        : null);

  if (commissionType === "value") {
    const commissionValue = overrides.commissionValueOverride ?? (commission?.CommissionType === "value" ? commission.CommissionAmount : undefined) ?? 0;
    return afterRebate - commissionValue;
  }
  if (commissionType === "percent") {
    const commissionPercent = overrides.commissionPercentOverride ?? (commission?.CommissionType === "percent" ? commission.CommissionAmount : undefined) ?? 0;
    return afterRebate - afterRebate * commissionPercent;
  }
  return afterRebate;
}

function resolveTransport(
  baseline: SalesRow,
  transportCost: TransportCostRow | null,
  overrides: QuoteOverrides,
  packQtyForWholePack: number | null
): { transport: number | null; transportUnitCostUsed: number | null } {
  if (overrides.transportOverride !== undefined) {
    return { transport: overrides.transportOverride, transportUnitCostUsed: null };
  }
  if (
    overrides.palletCostOverride !== undefined &&
    transportCost &&
    transportCost.Qty !== null &&
    transportCost.BoxesXPallet !== null &&
    transportCost.TransportUnitCost !== null
  ) {
    const unitCost =
      overrides.palletCostOverride / (transportCost.Qty * transportCost.BoxesXPallet * 0.75);
    const transport =
      packQtyForWholePack !== null ? unitCost * packQtyForWholePack : unitCost;
    return { transport, transportUnitCostUsed: unitCost };
  }
  const transportUnitCost = transportCost?.TransportUnitCost ?? null;
  const fallbackTransport =
    baseline.Transport ??
    (transportUnitCost !== null
      ? packQtyForWholePack !== null
        ? transportUnitCost * packQtyForWholePack
        : transportUnitCost
      : null);
  return { transport: fallbackTransport, transportUnitCostUsed: transportUnitCost };
}

export function recomputeSalesRow(inputs: RecomputeInputs, overrides: QuoteOverrides): RecomputeResult {
  const { baseline, commission, rebate, transportCost } = inputs;
  const mode = getSalesRowMode(baseline);
  const warnings: string[] = [];

  const avgUnitPriceBase = reconstructAvgUnitPriceBase(baseline, commission, rebate);
  const avgUnitPrice = recomputeAvgUnitPrice(avgUnitPriceBase, commission, rebate, overrides);

  const packQtyForWholePack =
    mode === "C" && baseline.Transport !== null && transportCost?.TransportUnitCost
      ? baseline.Transport / transportCost.TransportUnitCost
      : null;

  let finalPurPrice: number | null = null;
  let packing: number | null = null;
  let sticker: number | null = null;
  let labourProd: number | null = null;
  let labourRepack: number | null = null;
  let labourAssembler: number | null = null;
  let box: number | null = null;
  let purchaseCost: number | null = baseline.PurchaseCost;
  let yieldVal: number | null = baseline.Yield;

  const { transport, transportUnitCostUsed } = resolveTransport(
    baseline,
    transportCost,
    overrides,
    packQtyForWholePack
  );

  const extraCosts: number | null = overrides.extraCostsOverride ?? baseline.ExtraCosts ?? null;

  if (mode === "A") {
    purchaseCost = overrides.purchaseCostOverride ?? baseline.PurchaseCost;
    finalPurPrice = purchaseCost;
    box = overrides.boxOverride ?? baseline.Box;
    labourRepack = overrides.labourRepackOverride ?? baseline.LabourRepack;
    labourAssembler = overrides.labourAssemblerOverride ?? baseline.LabourAssembler;
  } else if (mode === "B") {
    purchaseCost = overrides.purchaseCostOverride ?? baseline.PurchaseCost;
    yieldVal = overrides.yieldOverride ?? baseline.Yield;
    if (yieldVal !== null && yieldVal > 0 && purchaseCost !== null && baseline.MeasurementUnitValue !== null) {
      finalPurPrice = (purchaseCost * baseline.MeasurementUnitValue) / yieldVal;
    } else {
      finalPurPrice = null;
    }
    packing = overrides.packingOverride ?? baseline.Packing;
    sticker = overrides.stickerOverride ?? baseline.Sticker;
    labourProd = overrides.labourProdOverride ?? baseline.LabourProd;
    box = overrides.boxOverride ?? baseline.Box;
    labourAssembler = overrides.labourAssemblerOverride ?? baseline.LabourAssembler;
    labourRepack = overrides.labourRepackOverride ?? baseline.LabourRepack;
  } else if (mode === "C") {
    finalPurPrice = overrides.mixedHerbFinalPurPriceOverride ?? baseline.FinalPurPrice;
    box = overrides.boxOverride ?? baseline.Box;
  } else {
    // mode === "none"
    finalPurPrice = null;
  }

  const finalUnitCost =
    finalPurPrice === null
      ? null
      : finalPurPrice + sumTreatingNullAsZero(packing, sticker, box, labourProd, labourRepack, labourAssembler, transport, extraCosts);

  const priceUsable = avgUnitPrice !== null && avgUnitPrice > 0;
  const costRatio = priceUsable ? ratioOrNull(finalUnitCost, avgUnitPrice) : null;
  const grossMargin =
    priceUsable && finalUnitCost !== null ? (avgUnitPrice - finalUnitCost) / avgUnitPrice : null;

  if (avgUnitPrice !== null && avgUnitPrice <= 0) {
    warnings.push("priceNotPositive");
  }

  const commissionApplied: 0 | 1 =
    overrides.commissionValueOverride !== undefined ||
    overrides.commissionPercentOverride !== undefined ||
    commission !== null
      ? 1
      : 0;

  const row: SalesRow = {
    ...baseline,
    AvgUnitPrice: avgUnitPrice,
    PurchaseCost: mode === "A" || mode === "B" ? purchaseCost : baseline.PurchaseCost,
    Yield: mode === "B" ? yieldVal : baseline.Yield,
    FinalPurPrice: finalPurPrice,
    Packing: packing,
    Sticker: sticker,
    Box: box,
    LabourProd: labourProd,
    LabourRepack: labourRepack,
    LabourAssembler: labourAssembler,
    Transport: transport,
    ExtraCosts: extraCosts,
    FinalUnitCost: finalUnitCost,
    CostRatio: costRatio,
    GrossMargin: grossMargin,
    CommissionApplied: commissionApplied,
  };

  return { row, mode, avgUnitPriceBase, transportUnitCostUsed, warnings };
}

function grossMarginAmount(row: SalesRow): number | null {
  return row.AvgUnitPrice !== null && row.FinalUnitCost !== null ? row.AvgUnitPrice - row.FinalUnitCost : null;
}

export interface DriverImpact {
  key: string;
  label: string;
  format: "currency" | "percent" | "number";
  baselineValue: number | null;
  currentValue: number;
  marginAmountDelta: number | null;
  grossMarginPctDelta: number | null;
}

/**
 * Each active override's own isolated effect on Gross Margin 
 */
export function buildDriverImpacts(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  fields: { key: string; label: string; format: string }[]
): DriverImpact[] {
  const baselineResult = recomputeSalesRow(inputs, {});
  const baselineMarginAmount = grossMarginAmount(baselineResult.row);
  const baselineMarginPct = baselineResult.row.GrossMargin;

  const results: DriverImpact[] = [];
  for (const f of fields) {
    const overrideValue = (overrides as Record<string, number | undefined>)[f.key];
    if (overrideValue === undefined) continue;

    const isolated = recomputeSalesRow(inputs, { [f.key]: overrideValue } as QuoteOverrides);
    const isolatedMarginAmount = grossMarginAmount(isolated.row);
    const baselineFieldValue = getCurrentFieldValue(f.key, inputs, {}, baselineResult.avgUnitPriceBase);

    results.push({
      key: f.key,
      label: f.label,
      format: f.format as DriverImpact["format"],
      baselineValue: baselineFieldValue,
      currentValue: overrideValue,
      marginAmountDelta:
        isolatedMarginAmount !== null && baselineMarginAmount !== null ? isolatedMarginAmount - baselineMarginAmount : null,
      grossMarginPctDelta:
        isolated.row.GrossMargin !== null && baselineMarginPct !== null ? isolated.row.GrossMargin - baselineMarginPct : null,
    });
  }

  return results.sort((a, b) => Math.abs(b.marginAmountDelta ?? 0) - Math.abs(a.marginAmountDelta ?? 0));
}

/**
 * The "current effective value" of an override field: whatever the user has
 * already set, else the row's own baseline value.
 */
export function getCurrentFieldValue(
  key: string,
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  avgUnitPriceBase: number | null
): number | null {
  const existing = (overrides as Record<string, number | undefined>)[key];
  if (existing !== undefined) return existing;
  const { baseline, commission, rebate, transportCost } = inputs;
  switch (key) {
    case "avgUnitPriceBaseOverride":
      return avgUnitPriceBase;
    case "rebateOverride":
      return rebate?.Rebate ?? 0;
    case "commissionPercentOverride":
      return commission?.CommissionType === "percent" ? commission.CommissionAmount : 0;
    case "commissionValueOverride":
      return commission?.CommissionType === "value" ? commission.CommissionAmount : 0;
    case "purchaseCostOverride":
      return baseline.PurchaseCost;
    case "yieldOverride":
      return baseline.Yield;
    case "packingOverride":
      return baseline.Packing;
    case "stickerOverride":
      return baseline.Sticker;
    case "labourProdOverride":
      return baseline.LabourProd;
    case "labourRepackOverride":
      return baseline.LabourRepack;
    case "labourAssemblerOverride":
      return baseline.LabourAssembler;
    case "boxOverride":
      return baseline.Box;
    case "transportOverride":
      return baseline.Transport ?? transportCost?.TransportUnitCost ?? null;
    case "palletCostOverride":
      return transportCost?.PalletCost ?? null;
    case "extraCostsOverride":
      return baseline.ExtraCosts ?? null;
    case "mixedHerbFinalPurPriceOverride":
      return baseline.FinalPurPrice;
    default:
      return null;
  }
}

function marginAtOverride(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  key: string,
  value: number
): number | null {
  return recomputeSalesRow(inputs, { ...overrides, [key]: value } as QuoteOverrides).row.GrossMargin;
}

/**
 * Generic bracket-expand-then-bisect root search -- shared mechanics behind
 * every "what value gets me to a target metric" search in this file.
 */
function bisectSearch(params: {
  lo: number;
  hi: number;
  step: number;
  growHi: (step: number) => number;
  advanceLo: boolean;
  guardNonPositiveHi: boolean;
  evaluate: (value: number) => number | null;
  shortOfTarget: (metric: number) => boolean;
  nullSentinel: number;
  bisectIterations?: number;
}): number | null {
  const { evaluate, shortOfTarget, nullSentinel, advanceLo, guardNonPositiveHi, growHi } = params;
  let { lo, hi, step } = params;
  const bisectIterations = params.bisectIterations ?? 40;
  const metricOf = (v: number) => evaluate(v) ?? nullSentinel;

  let iterations = 0;
  while (shortOfTarget(metricOf(hi)) && iterations < 40) {
    if (advanceLo) lo = hi;
    step *= 1.6;
    hi = growHi(step);
    if (guardNonPositiveHi && hi <= 0) {
      hi = lo / 2;
      if (hi < 1e-6) return null;
    }
    iterations++;
  }
  if (shortOfTarget(metricOf(hi))) return null;

  for (let i = 0; i < bisectIterations; i++) {
    const mid = (lo + hi) / 2;
    if (shortOfTarget(metricOf(mid))) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function findCeiling(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  key: string,
  start: number,
  direction: 1 | -1,
  threshold: number
): number | null {
  const step = Math.max(Math.abs(start) * 0.05, 0.001);
  return bisectSearch({
    lo: start,
    hi: start + direction * step,
    step,
    growHi: (s) => start + direction * s,
    advanceLo: true,
    guardNonPositiveHi: direction === -1,
    evaluate: (v) => marginAtOverride(inputs, overrides, key, v),
    shortOfTarget: (m) => m >= threshold,
    nullSentinel: -Infinity, // worse than any finite floor -- correctly "already crossed"
  });
}

function avgUnitPriceAtOverride(inputs: RecomputeInputs, overrides: QuoteOverrides, base: number): number | null {
  return recomputeSalesRow(inputs, { ...overrides, avgUnitPriceBaseOverride: base } as QuoteOverrides).row.AvgUnitPrice;
}

/**
 * Inverts "what List Price produces this exact net AvgUnitPrice" by
 * searching through recomputeSalesRow itself, so it can't drift out of
 * sync with recomputeAvgUnitPrice's real logic.
 */
function findAvgUnitPriceBaseForTarget(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  targetAvgUnitPrice: number
): number | null {
  const step = Math.max(targetAvgUnitPrice * 0.5, 0.01);
  return bisectSearch({
    lo: 0,
    hi: targetAvgUnitPrice + step,
    step,
    growHi: (s) => targetAvgUnitPrice + s,
    advanceLo: false,
    guardNonPositiveHi: false,
    evaluate: (v) => avgUnitPriceAtOverride(inputs, overrides, v),
    shortOfTarget: (price) => price < targetAvgUnitPrice,
    nullSentinel: -Infinity,
    bisectIterations: 60,
  });
}

export interface BootstrapPriceSuggestion {
  finalUnitCost: number;
  requiredAvgUnitPrice: number;
  suggestedListPrice: number | null;
}

export function buildBootstrapPriceSuggestion(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  targetMargin: number
): BootstrapPriceSuggestion | null {
  const finalUnitCost = recomputeSalesRow(inputs, overrides).row.FinalUnitCost;
  if (finalUnitCost === null) return null;
  if (targetMargin >= 1) {
    return { finalUnitCost, requiredAvgUnitPrice: finalUnitCost, suggestedListPrice: null };
  }
  const requiredAvgUnitPrice = finalUnitCost / (1 - targetMargin);
  const suggestedListPrice =
    requiredAvgUnitPrice > 0 ? findAvgUnitPriceBaseForTarget(inputs, overrides, requiredAvgUnitPrice) : null;
  return { finalUnitCost, requiredAvgUnitPrice, suggestedListPrice };
}

export interface HeadroomResult {
  key: string;
  label: string;
  format: "currency" | "percent" | "number";
  currentValue: number;
  direction: 1 | -1; // which way this field has to move to hurt margin
  currentMargin: number | null;
  alreadyBelowFloor: boolean; // already below THRESHOLDS.MIN_GROSS_MARGIN (20%) at the current value
  ceilingAtFloor: number | null; // value at which margin crosses the 20% floor
  ceilingAtRed: number | null; // value at which margin crosses the 10% red floor
}

/**
 * "How much room do I have to negotiate this lever before it hurts?"
 */
export function buildNegotiationHeadroom(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  fields: { key: string; label: string; format: string }[]
): HeadroomResult[] {
  const avgUnitPriceBase = reconstructAvgUnitPriceBase(inputs.baseline, inputs.commission, inputs.rebate);
  const results: HeadroomResult[] = [];

  for (const f of fields) {
    const currentValue = getCurrentFieldValue(f.key, inputs, overrides, avgUnitPriceBase);
    if (currentValue === null || currentValue === 0) continue;

    const step = Math.max(Math.abs(currentValue) * 0.02, 0.0005);
    const marginPlus = marginAtOverride(inputs, overrides, f.key, currentValue + step);
    const marginMinus = marginAtOverride(inputs, overrides, f.key, currentValue - step);
    if (marginPlus === null || marginMinus === null || marginPlus === marginMinus) continue;
    const direction: 1 | -1 = marginPlus < marginMinus ? 1 : -1;

    const currentMargin = marginAtOverride(inputs, overrides, f.key, currentValue);

    results.push({
      key: f.key,
      label: f.label,
      format: f.format as HeadroomResult["format"],
      currentValue,
      direction,
      currentMargin,
      alreadyBelowFloor: currentMargin !== null && currentMargin < THRESHOLDS.MIN_GROSS_MARGIN - 1e-9,
      ceilingAtFloor: findCeiling(inputs, overrides, f.key, currentValue, direction, THRESHOLDS.MIN_GROSS_MARGIN),
      ceilingAtRed: findCeiling(inputs, overrides, f.key, currentValue, direction, THRESHOLDS.GROSS_MARGIN_CELL_YELLOW_FLOOR),
    });
  }

  return results.sort((a, b) => {
    const roomA = a.ceilingAtFloor !== null ? Math.abs(a.ceilingAtFloor - a.currentValue) / Math.abs(a.currentValue) : Infinity;
    const roomB = b.ceilingAtFloor !== null ? Math.abs(b.ceilingAtFloor - b.currentValue) / Math.abs(b.currentValue) : Infinity;
    return roomA - roomB;
  });
}

// Same domain rules the inputs panel enforces on typed values
function isSuggestionInDomain(key: string, value: number): boolean {
  if (key === "commissionPercentOverride") return value >= 0 && value < 1;
  if (key === "yieldOverride") return value > 0;
  return value >= 0;
}

/**
 * Same bracket-expand-then-bisect approach as findCeiling, generalized to
 * search toward an arbitrary target margin in whichever direction gets
 */
function findValueForTarget(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  key: string,
  start: number,
  direction: 1 | -1,
  target: number,
  increasing: boolean
): number | null {
  const step = Math.max(Math.abs(start) * 0.05, 0.001);
  const result = bisectSearch({
    lo: start,
    hi: start + direction * step,
    step,
    growHi: (s) => start + direction * s,
    advanceLo: true,
    guardNonPositiveHi: direction === -1,
    evaluate: (v) => marginAtOverride(inputs, overrides, key, v),
    shortOfTarget: (m) => (increasing ? m < target : m > target),
    nullSentinel: increasing ? -Infinity : Infinity,
  });
  return result !== null && isSuggestionInDomain(key, result) ? result : null;
}

export interface TargetMarginSuggestion {
  key: string;
  label: string;
  format: "currency" | "percent" | "number";
  currentValue: number;
  suggestedValue: number | null; // null = not reachable by moving this lever alone
}

/**
 * "If I only moved THIS lever, what value hits my target margin exactly?" --
 * one independent single-variable suggestion per field, holding every other
 * override fixed.
 */
export function buildTargetMarginSuggestions(
  inputs: RecomputeInputs,
  overrides: QuoteOverrides,
  fields: { key: string; label: string; format: string }[],
  targetMargin: number
): TargetMarginSuggestion[] {
  const avgUnitPriceBase = reconstructAvgUnitPriceBase(inputs.baseline, inputs.commission, inputs.rebate);
  const results: TargetMarginSuggestion[] = [];

  for (const f of fields) {
    const currentValue = getCurrentFieldValue(f.key, inputs, overrides, avgUnitPriceBase);
    if (currentValue === null || currentValue === 0) continue;

    const currentMargin = marginAtOverride(inputs, overrides, f.key, currentValue);
    if (currentMargin === null) continue;
    if (Math.abs(currentMargin - targetMargin) < 1e-9) {
      results.push({ key: f.key, label: f.label, format: f.format as TargetMarginSuggestion["format"], currentValue, suggestedValue: currentValue });
      continue;
    }

    const step = Math.max(Math.abs(currentValue) * 0.02, 0.0005);
    const marginPlus = marginAtOverride(inputs, overrides, f.key, currentValue + step);
    const marginMinus = marginAtOverride(inputs, overrides, f.key, currentValue - step);
    if (marginPlus === null || marginMinus === null || marginPlus === marginMinus) continue;

    const needsIncrease = targetMargin > currentMargin;
    const direction: 1 | -1 = needsIncrease
      ? marginPlus > marginMinus
        ? 1
        : -1
      : marginPlus < marginMinus
        ? 1
        : -1;

    const suggestedValue = findValueForTarget(inputs, overrides, f.key, currentValue, direction, targetMargin, needsIncrease);

    results.push({
      key: f.key,
      label: f.label,
      format: f.format as TargetMarginSuggestion["format"],
      currentValue,
      suggestedValue,
    });
  }

  return results.sort((a, b) => {
    const changeA = a.suggestedValue !== null ? Math.abs(a.suggestedValue - a.currentValue) / Math.abs(a.currentValue) : Infinity;
    const changeB = b.suggestedValue !== null ? Math.abs(b.suggestedValue - b.currentValue) / Math.abs(b.currentValue) : Infinity;
    return changeA - changeB;
  });
}
