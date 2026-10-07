import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import { ratioOrNull, sumTreatingNullAsZero } from "@/entities/grossMarginSalesRow";
import { THRESHOLDS } from "@/shared/lib/thresholds";

// Quote Simulator's pure math core -- ports sql/15_sales.sql's Final/
// WithTotal CTEs into TypeScript so a user can edit the raw inputs and see
// GrossMargin recompute instantly, client-side, without touching the
// database. No I/O, no React -- a pure function of (baseline row + matched
// reference rows + user overrides) -> a new SalesRow-shaped result, so
// lib/zones.ts's computeCostBreakdown() and lib/alarms.ts's evaluateAlarms()
// (both already pure functions of a SalesRow) work unmodified on the output.
//
// DESIGN: anchors on the baseline SalesRow's own already-resolved fields
// (already per-unit for Modes A/B, already whole-pack for Mode C) rather
// than reconstructing case-level CostReference numbers -- every output
// field defaults to `baseline.X` unless overridden. This makes zero-
// override baseline reproduction exact BY CONSTRUCTION (nothing to
// re-derive, nothing to get subtly wrong) and needs no PackQty
// back-derivation, which sql/15_sales.sql's mv.Qty never surfaces on
// db_ai.Sales/SalesRow at all.

export type SalesRowMode = "A" | "B" | "C" | "none";
// A = Flag=1, bought pre-packaged by the unit (supplier already packaged it).
// B = Flag=0, bought raw by the pound (we do production ourselves).
// C = IsMixedHerbWholePack=1, a blend -- every dollar figure on the row is
//     a whole-pack total, not per-unit (see sql/15_sales.sql's 2026-07-24
//     mixed-herb rewrite).
// none = Flag is null, no purchase-cost basis matched at all.

export function getSalesRowMode(row: SalesRow): SalesRowMode {
  if (row.IsMixedHerbWholePack === 1) return "C";
  if (row.Flag === 1) return "A";
  if (row.Flag === 0) return "B";
  return "none";
}

export interface QuoteOverrides {
  // Price side, universal across all modes.
  avgUnitPriceBaseOverride?: number; // pre-Rebate, pre-Commission "list" price
  rebateOverride?: number; // flat $ per unit
  commissionPercentOverride?: number; // fraction 0-1, only meaningful if the matched Commission is percent-type
  commissionValueOverride?: number; // flat $, only meaningful if the matched Commission is value-type

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

  // Transport -- either edit the $ directly, or (when a matching
  // TransportCostRow with a non-null TransportUnitCost exists) negotiate
  // the underlying PalletCost and let TransportUnitCost recompute for real.
  transportOverride?: number;
  palletCostOverride?: number;

  // Cost side -- Mode C only, opaque whole-pack total (see the Context note
  // in the plan on why per-child editing isn't in this version).
  mixedHerbFinalPurPriceOverride?: number;
}

export interface RecomputeInputs {
  baseline: SalesRow;
  commission: CommissionRow | null; // matched on (Customer, Variety); null if none on file
  rebate: RebateRow | null; // matched on Customer; null if none on file
  transportCost: TransportCostRow | null; // matched on (Customer=DivisionName, MeasurementUnitValue); null if none on file
}

export interface RecomputeResult {
  row: SalesRow;
  mode: SalesRowMode;
  /** Reconstructed pre-Rebate, pre-Commission price -- the real "starting" number for the price-side inputs. */
  avgUnitPriceBase: number | null;
  /** Transport unit cost actually used, whether direct or PalletCost-derived -- useful for the transparency panel. */
  transportUnitCostUsed: number | null;
  warnings: string[];
}

function reconstructAvgUnitPriceBase(
  baseline: SalesRow,
  commission: CommissionRow | null,
  rebate: RebateRow | null
): number | null {
  if (baseline.AvgUnitPrice === null) return null;
  // Invert SalesWithCommission's own order (sql/15_sales.sql): Commission
  // was subtracted from the Rebate-adjusted price, so undo Commission first.
  let afterRebate = baseline.AvgUnitPrice;
  if (commission) {
    if (commission.CommissionType === "value" && commission.CommissionValue !== null) {
      afterRebate = baseline.AvgUnitPrice + commission.CommissionValue;
    } else if (commission.CommissionType === "percent" && commission.CommissionPercent !== null) {
      const denom = 1 - commission.CommissionPercent;
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

  // Type comes from the matched CommissionRow when there is one; otherwise
  // from whichever override key the user actually typed into -- lets a row
  // with NO commission on file at all still be modeled ("what if we started
  // charging one"), not just tuned once one already exists. Previously this
  // bailed out to `afterRebate` unconditionally whenever `commission` was
  // null, silently discarding any commission override the user had entered.
  const commissionType =
    commission?.CommissionType ??
    (overrides.commissionValueOverride !== undefined
      ? "value"
      : overrides.commissionPercentOverride !== undefined
        ? "percent"
        : null);

  if (commissionType === "value") {
    const commissionValue = overrides.commissionValueOverride ?? commission?.CommissionValue ?? 0;
    return afterRebate - commissionValue;
  }
  if (commissionType === "percent") {
    const commissionPercent = overrides.commissionPercentOverride ?? commission?.CommissionPercent ?? 0;
    return afterRebate - afterRebate * commissionPercent;
  }
  return afterRebate;
}

/** Transport: direct $ override wins if present; else negotiate via PalletCost when possible; else baseline. */
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
  // A real existing Sales row's baseline.Transport already reflects
  // whatever the SQL pipeline's own join against DivisionTransportCost
  // found (or correctly left null if nothing matched) -- so for a real row
  // this is always a no-op, never overriding real data. But a manual-entry
  // row (buildManualBaseline/buildSyntheticBaseline's own warehouse-borrow
  // path) always starts with baseline.Transport = null, since there's no
  // template row to copy it from -- found and fixed 2026-09-17, discovered
  // while adding the "New Variety" tab's existing-customer path, which
  // matches a real TransportCostRow (findTransportCostForRow) specifically
  // so it can be used here instead of staying blank. TransportUnitCost is
  // already per-unit at the source (no further division needed).
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

  // Back out the row's own whole-pack multiplier ONLY for the Mode C
  // PalletCost-negotiation display path -- optional context, never load-
  // bearing for the math elsewhere (see resolveTransport above: falls back
  // to baseline.Transport whenever this isn't cleanly derivable).
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

  if (mode === "A") {
    purchaseCost = overrides.purchaseCostOverride ?? baseline.PurchaseCost;
    finalPurPrice = purchaseCost;
    box = overrides.boxOverride ?? baseline.Box;
    labourRepack = overrides.labourRepackOverride ?? baseline.LabourRepack;
    labourAssembler = overrides.labourAssemblerOverride ?? baseline.LabourAssembler;
    // Packing/Sticker/LabourProd stay null -- structurally N/A for this mode.
  } else if (mode === "B") {
    purchaseCost = overrides.purchaseCostOverride ?? baseline.PurchaseCost;
    yieldVal = overrides.yieldOverride ?? baseline.Yield;
    if (yieldVal !== null && yieldVal > 0 && purchaseCost !== null && baseline.MeasurementUnitValue !== null) {
      finalPurPrice = (purchaseCost * baseline.MeasurementUnitValue) / yieldVal;
    } else {
      finalPurPrice = null; // mirrors SQL: missing/zero Yield = no cost basis, never a guessed value
    }
    packing = overrides.packingOverride ?? baseline.Packing;
    sticker = overrides.stickerOverride ?? baseline.Sticker;
    labourProd = overrides.labourProdOverride ?? baseline.LabourProd;
    box = overrides.boxOverride ?? baseline.Box;
    labourAssembler = overrides.labourAssemblerOverride ?? baseline.LabourAssembler;
    // CATALOG-WIDE FIX (2026-08-19, sql/15_sales.sql): LabourRepack now
    // applies to Flag=0 too, not just Flag=1 -- this branch previously left
    // it null ("structurally N/A for this mode"), which was true before
    // that SQL change but silently broke the "zero-override reproduces the
    // real baseline exactly" guarantee this file's own top comment
    // promises: a fresh Mode B row would show a ~$0.03-too-low cost (margin
    // too high) versus its own real baseline, before any override was even
    // touched. Caught live testing the Quote Simulator immediately after
    // today's SQL fix.
    labourRepack = overrides.labourRepackOverride ?? baseline.LabourRepack;
  } else if (mode === "C") {
    finalPurPrice = overrides.mixedHerbFinalPurPriceOverride ?? baseline.FinalPurPrice;
    box = overrides.boxOverride ?? baseline.Box;
    // Packing/Sticker/LabourProd/LabourRepack/LabourAssembler all stay null
    // -- already folded per-child into FinalPurPrice by the SQL pipeline.
  } else {
    // mode === "none": no purchase-cost basis at all, matches SQL's ELSE NULL.
    finalPurPrice = null;
  }

  const finalUnitCost =
    finalPurPrice === null
      ? null
      : finalPurPrice + sumTreatingNullAsZero(packing, sticker, box, labourProd, labourRepack, labourAssembler, transport);

  // A zero-or-negative price makes Cost Ratio/Gross Margin meaningless, not
  // just undefined -- a negative denominator flips the sign of the ratio
  // into something that reads as a plausible (if extreme) percentage rather
  // than the nonsense it actually is, so this has to be explicit rather
  // than relying on ratioOrNull's plain "denominator === 0" null check.
  const priceUsable = avgUnitPrice !== null && avgUnitPrice > 0;
  const costRatio = priceUsable ? ratioOrNull(finalUnitCost, avgUnitPrice) : null;
  const grossMargin =
    priceUsable && finalUnitCost !== null ? (avgUnitPrice - finalUnitCost) / avgUnitPrice : null;

  if (avgUnitPrice !== null && avgUnitPrice <= 0) {
    warnings.push("Simulated Avg Unit Price is zero or negative — Cost Ratio and Gross Margin can't be computed.");
  }

  // Presence check, not truthiness -- an explicit $0/0% override is still a
  // real commission association (matches sql/15_sales.sql's own semantics,
  // `CASE WHEN CC.Customer IS NOT NULL THEN 1 ELSE 0 END`, an existence
  // check, not a non-zero check). The previous `(a ?? b ?? c) ? 1 : 0` chain
  // correctly preserved an explicit 0 through `??`, then silently lost it by
  // treating that 0 as falsy in the ternary. Found in the 2026-09-21 audit.
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
 * Each active override's OWN isolated effect on Gross Margin -- this field
 * changed, alone, from the untouched baseline, with every other field left
 * at its real baseline value. Deliberately NOT sequential/order-dependent
 * (unlike the old waterfall this replaced): a user moving three sliders at
 * once shouldn't have to know or care what order the pipeline happens to
 * sum its terms in to understand which one lever matters most.
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
 * already set, else the row's own baseline value for that field. This is
 * the anchor sensitivity analysis shifts ±X% around -- per the plan,
 * sensitivity answers "given what I've already changed, what matters most
 * NEXT," not "what mattered from a totally untouched baseline."
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
      return commission?.CommissionPercent ?? 0;
    case "commissionValueOverride":
      return commission?.CommissionValue ?? 0;
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
      // Same fallback as resolveTransport above: a manual-entry row has no
      // baseline.Transport of its own, so fall back to the live matched
      // TransportCostRow (already per-unit) rather than showing "no value"
      // when the calculation itself is actually using a real number.
      return baseline.Transport ?? transportCost?.TransportUnitCost ?? null;
    case "palletCostOverride":
      return transportCost?.PalletCost ?? null;
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
 * Generic bracket-expand-then-bisect root search -- the shared mechanics
 * behind every "what value gets me to a target metric" search in this file
 * (findCeiling/findAvgUnitPriceBaseForTarget/findValueForTarget below).
 * Numeric, not closed-form: several levers (Yield, Commission %) divide
 * rather than add into the final metric, so a plain algebraic inverse
 * doesn't exist for every field.
 *
 * Two phases:
 *  1. Bracket -- starting from the caller's initial `(lo, hi, step)`, grow
 *     `hi` via `growHi(step)` (×1.6 each round) until `evaluate(hi)` is no
 *     longer `shortOfTarget` -- i.e. the target is now known to lie between
 *     the last two guesses.
 *  2. Bisect -- halve that bracket `bisectIterations` times.
 *
 * The three callers below anchor and advance their search differently (a
 * field's current value vs. a fixed $0 floor toward the target itself,
 * `lo` tracking the bracket vs. staying fixed) -- deliberately NOT folded
 * into one shape, since that difference is real, not incidental. Only the
 * loop mechanics -- identical across all three, including the magic
 * constants (0.05 initial-step fraction, ×1.6 growth, the 1e-6 floor guard)
 * -- are shared here.
 */
function bisectSearch(params: {
  lo: number;
  hi: number;
  step: number;
  growHi: (step: number) => number;
  advanceLo: boolean; // false for findAvgUnitPriceBaseForTarget: lo stays pinned at 0 (price can't be negative), never tracks the bracket
  guardNonPositiveHi: boolean; // true for direction === -1 searches: clamp hi to lo/2 instead of crossing zero
  evaluate: (value: number) => number | null;
  shortOfTarget: (metric: number) => boolean;
  nullSentinel: number; // what a null evaluation counts as -- always "still short," direction-dependent
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
      if (hi < 1e-6) return null; // would require a negative/zero value -- unreachable
    }
    iterations++;
  }
  if (shortOfTarget(metricOf(hi))) return null; // not sensitive enough to this field within a sane range

  for (let i = 0; i < bisectIterations; i++) {
    const mid = (lo + hi) / 2;
    if (shortOfTarget(metricOf(mid))) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The value of `key`, moving away from `start` in `direction`, at which
 * GrossMargin first crosses below `threshold`.
 */
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
 * searching through recomputeSalesRow itself -- never re-derives the
 * Rebate/Commission branching as a separate formula, so it can't drift out
 * of sync with recomputeAvgUnitPrice's real logic. AvgUnitPrice rises
 * monotonically with avgUnitPriceBaseOverride for both commission types
 * (percent-type multiplies by a positive (1 - commissionPercent) factor,
 * value-type just subtracts a constant), so a plain bracket-expand-then-
 * bisect search is safe.
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
    advanceLo: false, // lo stays pinned at $0 -- a price can't be negative
    guardNonPositiveHi: false,
    evaluate: (v) => avgUnitPriceAtOverride(inputs, overrides, v),
    shortOfTarget: (price) => price < targetAvgUnitPrice,
    nullSentinel: -Infinity,
    bisectIterations: 60, // finer precision than the other two searches -- price sensitivity matters more here
  });
}

export interface BootstrapPriceSuggestion {
  finalUnitCost: number;
  requiredAvgUnitPrice: number; // the net (post-Rebate/Commission) price needed to hit the target margin
  suggestedListPrice: number | null; // the avgUnitPriceBaseOverride to apply; null if unreachable (e.g. target margin >= 100%)
}

/**
 * "There's no current price yet, but the cost side IS known -- what
 * starting List Price would hit the target margin?" For a brand-new manual
 * quote, GrossMargin is null until BOTH price and cost exist
 * (recomputeSalesRow requires both), so buildTargetMarginSuggestions has
 * nothing to search FROM yet -- this bootstraps that starting point,
 * closed-form on the cost side (FinalUnitCost / (1 - targetMargin)), then
 * inverted through the real Rebate/Commission logic via
 * findAvgUnitPriceBaseForTarget above, never a parallel formula. Returns a
 * SINGLE suggestion (the price itself), not a multi-lever list -- there's
 * no "current" state to hold every other lever at yet, same reasoning
 * buildTargetMarginSuggestions' own doc comment gives for the normal case.
 */
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
 * "How much room do I have to negotiate this lever before it hurts?" --
 * for each field, holding every other current override fixed, the concrete
 * value (a real $/lb, a real $ transport rate, ...) at which Gross Margin
 * would cross the company's own 20% floor and the harder 10% floor. Ranked
 * tightest-room-first: the lever with the least room to move is the one
 * most worth knowing about before a negotiation.
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

// Same domain rules the inputs panel enforces on typed values -- imported
// here (not re-declared) so the solver can never suggest a value the field
// itself would reject as invalid.
function isSuggestionInDomain(key: string, value: number): boolean {
  if (key === "commissionPercentOverride") return value >= 0 && value < 1;
  if (key === "yieldOverride") return value > 0;
  return value >= 0;
}

/**
 * Same bracket-expand-then-bisect approach as findCeiling, generalized to
 * search toward an arbitrary target margin in whichever direction (margin
 * rising OR falling) actually gets there, rather than always "margin falls
 * below a floor." `increasing` says which way margin needs to move as the
 * field moves in `direction`.
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
 * current override fixed. Deliberately not a joint multi-variable optimizer:
 * a real negotiation is "which ONE thing could I ask for," not an
 * optimally-blended combination of six simultaneous asks. Ranked by
 * smallest relative change first -- the easiest, most plausible single ask.
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
