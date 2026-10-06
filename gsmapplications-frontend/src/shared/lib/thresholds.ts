// The worst-case-scenario business rules, as fractions of AvgUnitPrice
// (except MIN_GROSS_MARGIN, which is a floor on GrossMargin itself). Source:
// user's brainstorm session, 2026-07-17. Adjust here only -- every component
// reads from this file, nothing hardcodes a percentage elsewhere.
//
// FREIGHT_MAX removed 2026-07-17 (team decision): freight/extra costs are no
// longer tracked as their own db_ai.Sales column -- they now get folded
// directly into Purchase Cost instead, so PURCHASE_COST_MAX absorbs them.
//
// PURCHASE_COST_MAX raised 36% -> 42% (2026-07-22, user instruction): once
// db_ai.SupplierExtraCost started folding into PurchaseCost (2026-07-21),
// the 36% ceiling was measuring a cost base that's now structurally larger
// than what the original 36% figure was set against -- the threshold itself
// needed to move, not the underlying rule.
export const THRESHOLDS = {
  PURCHASE_COST_MAX: 0.42,
  PACKING_MAX: 0.08,
  LABOUR_MAX: 0.17,
  TRANSPORT_MAX: 0.13,
  MIN_GROSS_MARGIN: 0.2,
  // Gross Margin traffic-light banding (2026-07-23, user instruction):
  // green >= 20% (MIN_GROSS_MARGIN), yellow from 10% up to (not including)
  // 20%, red below 10%. Shared by BOTH Sales Explorer's Gross Margin cell
  // AND the Cost Breakdown tab's margin category (2026-07-23, user
  // instruction) -- previously these were two differently-shaped bands (the
  // Cost Breakdown tab's yellow sat ABOVE the floor instead of below it);
  // the user asked for one consistent rule across both tabs, so both now
  // read grossMarginCellZone() in entities/sales-row/model/zones.ts.
  GROSS_MARGIN_CELL_YELLOW_FLOOR: 0.1,
} as const;

// NOTE (updated 2026-07-22): Transport used to be defined in the SQL as
// exactly 0.13 * AvgUnitPrice (a fixed placeholder), so this rule could
// never mathematically fire. As of db_ai.DivisionTransportCost
// (21_division_transport_cost.sql), Transport is now a real per-unit dollar
// cost looked up by (Customer, MeasurementUnitValue) -- this rule is fully
// live and can genuinely trigger now. It's also NULL on 26/150 rows (no
// division/package-size match with a usable TransportUnitCost in the source
// data) -- those read "no data", never a guessed 0.

// No business-noun dependency (pure constants) -- lives in shared/, not any
// one entity, since it's read by entities/sales-row's own model AND by
// Quote Simulator components that operate on synthetic (not-yet-real) rows.
// REFACTOR_PLAN.md phase 03.
