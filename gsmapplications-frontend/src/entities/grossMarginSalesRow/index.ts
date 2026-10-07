// Public API for the sales-row entity -- the ONLY path external code should
// import through (never reach into model/* directly). alarms.ts, zones.ts,
// aggregate.ts and overview-stats.ts all live here (not shared/) because
// they depend on SalesRow -- an entity-level type shared/ can never import,
// since shared is the floor layer and imports nothing from above it.
export type { SalesRow } from "./model/types";
export { ALARM_LABELS, evaluateAlarms } from "./model/alarms";
export type { AlarmState, RowAlarms, AlarmRuleKey } from "./model/alarms";
export { computeCostBreakdown, grossMarginCellZone, sumTreatingNullAsZero, ratioOrNull } from "./model/zones";
export type { Zone, CostCategory } from "./model/zones";
export {
  aggregateByVariety,
  aggregateByCustomer,
  customersForVariety,
  cellKey,
  buildHeatmapData,
} from "./model/aggregate";
export type { RankMetric, VarietyAgg, CustomerAgg, HeatmapCell, HeatmapData } from "./model/aggregate";
export { computeOverviewStats } from "./model/overviewStats";
export type { RuleStats, WarehouseStats, OverviewStats } from "./model/overviewStats";
export { fetchSalesRows } from "./api/fetchSales";
export { useSalesData } from "./model/useSalesData";
export { AlarmBadge, type AlarmBadgeDetail } from "./ui/AlarmBadge";
export { AlarmsCell } from "./ui/AlarmsCell";
