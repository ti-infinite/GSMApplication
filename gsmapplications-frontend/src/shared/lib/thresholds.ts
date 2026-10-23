// Worst-case business thresholds, as fractions of AvgUnitPrice (except
// MIN_GROSS_MARGIN, a floor on GrossMargin itself) -- single source of
// truth, nothing hardcodes these percentages elsewhere. Lives in shared/,
// not an entity, since both sales-row and Quote Simulator read it.
//
// No FREIGHT_MAX: freight/extra costs now fold into Purchase Cost, so
// PURCHASE_COST_MAX already absorbs them.
export const THRESHOLDS = {
  PURCHASE_COST_MAX: 0.42,
  PACKING_MAX: 0.08,
  LABOUR_MAX: 0.17,
  TRANSPORT_MAX: 0.13,
  MIN_GROSS_MARGIN: 0.2,
  // Shared by Sales Explorer's margin cell AND Cost Breakdown's margin
  // category -- both must read the same band via grossMarginCellZone().
  GROSS_MARGIN_CELL_YELLOW_FLOOR: 0.1,
} as const;

// A cost category enters the amber "close to a limit" zone once its ratio
// crosses this share of its max -- an early warning before a row actually
// breaches a rule. Margin uses its own banding (grossMarginCellZone).
export const YELLOW_RATIO_OF_MAX = 0.9;

// Whole-percent display form ("42%", never "42.0%") so every piece of UI
// that quotes a limit renders it the same way.
export function thresholdPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export const THRESHOLD_LABELS = {
  purchaseCost: thresholdPercent(THRESHOLDS.PURCHASE_COST_MAX),
  packing: thresholdPercent(THRESHOLDS.PACKING_MAX),
  labour: thresholdPercent(THRESHOLDS.LABOUR_MAX),
  transport: thresholdPercent(THRESHOLDS.TRANSPORT_MAX),
  margin: thresholdPercent(THRESHOLDS.MIN_GROSS_MARGIN),
  // How close to a limit counts as "close" (e.g. "10%").
  amberBand: thresholdPercent(1 - YELLOW_RATIO_OF_MAX),
} as const;
