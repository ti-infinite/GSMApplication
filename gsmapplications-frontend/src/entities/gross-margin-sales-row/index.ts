// Public API for the sales-row entity -- the ONLY path external code should
// import through (never reach into model/* directly). REFACTOR_PLAN.md
// phase 03. alarms.ts and zones.ts both live here (not shared/) because
// they depend on SalesRow -- an entity-level type shared/ can never import,
// since shared is the floor layer and imports nothing from above it.
export type { SalesRow } from "./model/types";
export { evaluateAlarms } from "./model/alarms";
export type { AlarmState, AlarmRuleKey } from "./model/alarms";
export { computeCostBreakdown, grossMarginCellZone, sumTreatingNullAsZero, ratioOrNull } from "./model/zones";
export type { Zone, CostCategory } from "./model/zones";
export { fetchSalesRows } from "./api/fetch-sales";
export { useSalesData } from "./model/use-sales-data";
export { AlarmBadge } from "./ui/alarm-badge";
export { AlarmsCell } from "./ui/alarms-cell";

// api/export.ts (buildSalesExportWorkbook, SalesExportFilterInfo) is
// deliberately NOT re-exported here -- same reason as
// features/quote-simulator/index.ts excludes its export builder: it pulls
// in ExcelJS + Node's `fs` (via lib/excel-brand.ts), and this barrel is
// imported by "use client" code (useSalesData above) as a VALUE, so
// Next.js would have to bundle everything re-exported here for the browser
// too. Confirmed live this session for the quote-simulator case -- broke
// the dev server with "Module not found: fs" -- and independently found
// and fixed the identical way on the develop branch for this exact file,
// which is about as strong a cross-validation of the pattern as it gets.
// Its one consumer (apps/full-dashboard/app/api/sales/export/route.ts,
// server-only) imports it directly from "@/entities/gross-margin-sales-row/api/export".
//
// api/route-handler.ts (salesGetHandler, the shared GET /api/sales body
// deduped across all 3 apps) is excluded from this barrel too, for a
// different reason: it's a Next.js Route Handler, and re-exporting it
// through the entity's public API would put framework-specific code on
// the one layer this whole GSM-migration plan is built on staying 100%
// framework-free. Each app's app/api/sales/route.ts imports it directly
// from "@/entities/gross-margin-sales-row/api/route-handler" instead.
