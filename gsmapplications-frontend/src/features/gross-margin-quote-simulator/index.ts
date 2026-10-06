// Public API for the Quote Simulator feature -- the ONLY path external code
// should import through. REFACTOR_PLAN.md Backend/structure follow-up:
// this feature (21 UI components, 8 model modules, 4 hooks) previously sat
// flat in components/lib/hooks with no FSD boundary at all.
//
// Next.js -> Vite conversion: ./model/quote-scenario-export used to pull in
// ExcelJS (a Node-only `fs` dependency via excel-brand.ts) and was
// deliberately excluded from this barrel for exactly that reason -- a real,
// live-confirmed client/server bundling bug otherwise ("Module not found:
// Can't resolve 'fs'"). That workbook-building code moved to the relay
// (Python/openpyxl) as part of the Vite conversion; what's left in that
// file (buildQuoteRowValues) is pure client-side business logic with no
// Node dependency at all. It's still not re-exported here, but only
// because its one consumer (quote-simulator-scenario-manager.tsx) is
// itself inside this feature and imports it directly -- not a bundling
// concern anymore, just the normal "internal, not part of the public API"
// rule.
export { QuoteSimulatorTab } from "./ui/quote-simulator-tab";
