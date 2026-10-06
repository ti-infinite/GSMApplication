import type { SalesRow } from "@/entities/gross-margin-sales-row";
import type { QuoteOverrides } from "./recompute";

// Local-only scenario persistence for the Quote Simulator -- explicitly
// NOT written to NHUBEX/any database (user's 2026-07-27 instruction: real
// negotiating what-ifs shouldn't touch production tables). Pure
// localStorage, no React, no server calls.

const STORAGE_KEY = "quoteSimulator:scenarios:v1";
const MAX_SCENARIOS = 100;

export interface QuoteScenario {
  // v2 (2026-09-11) added packQuantity, captured from the Pack Pricing
  // card's quantity at save time -- needed so the Excel export's "Final
  // Price" can be a real whole-pack/case total, not an arbitrary default.
  // v1 records already in someone's browser localStorage have no
  // packQuantity at all; readAll() below still accepts them (schemaVersion
  // 1 or 2), and every consumer falls back to defaultPackQuantity(row) when
  // it's missing -- same default logic quote-simulator-tab.tsx already
  // uses for a freshly-selected row.
  schemaVersion: 1 | 2;
  id: string;
  name: string;
  savedAt: string; // ISO 8601
  baselineIdentity: {
    calculatedSKU: string;
    skuMeasure: string;
    variety: string;
    customer: string;
    warehouse: string;
  };
  overrides: QuoteOverrides;
  // Full snapshot at save time -- lets the scenario still render a
  // comparison even if the pipeline reruns and numbers shift, or the row
  // disappears from the current dataset entirely.
  baselineSnapshot: SalesRow;
  packQuantity?: number; // present from v2 onward
}

function readAll(): QuoteScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is QuoteScenario => s && (s.schemaVersion === 1 || s.schemaVersion === 2));
  } catch {
    return [];
  }
}

function writeAll(scenarios: QuoteScenario[]): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Not available server-side." };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save — your browser's local storage may be full." };
  }
}

export function listScenarios(): QuoteScenario[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveScenario(
  name: string,
  baseline: SalesRow,
  overrides: QuoteOverrides,
  packQuantity: number
): { ok: true; scenario: QuoteScenario } | { ok: false; error: string } {
  const existing = readAll();
  if (existing.length >= MAX_SCENARIOS) {
    return { ok: false, error: `You've reached the ${MAX_SCENARIOS}-scenario limit — delete one before saving another.` };
  }
  const scenario: QuoteScenario = {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name,
    savedAt: new Date().toISOString(),
    baselineIdentity: {
      calculatedSKU: baseline.CalculatedSKU,
      skuMeasure: baseline.SKUMeasure,
      variety: baseline.Variety,
      customer: baseline.Customer,
      warehouse: baseline.Warehouse,
    },
    overrides,
    baselineSnapshot: baseline,
    packQuantity,
  };
  const result = writeAll([...existing, scenario]);
  if (!result.ok) return result;
  return { ok: true, scenario };
}

export function deleteScenario(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

/** Finds the scenario's baseline row in the current live dataset, if it's still there. */
export function resolveScenarioRow(scenario: QuoteScenario, currentRows: SalesRow[]): SalesRow | null {
  return (
    currentRows.find(
      (r) =>
        r.CalculatedSKU === scenario.baselineIdentity.calculatedSKU &&
        r.SKUMeasure === scenario.baselineIdentity.skuMeasure &&
        r.Customer === scenario.baselineIdentity.customer &&
        r.Warehouse === scenario.baselineIdentity.warehouse
    ) ?? null
  );
}
