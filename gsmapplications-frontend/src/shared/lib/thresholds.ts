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
