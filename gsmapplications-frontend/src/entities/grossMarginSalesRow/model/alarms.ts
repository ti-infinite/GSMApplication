import type { SalesRow } from "./types";
import { THRESHOLDS } from "@/shared/lib/thresholds";

export type AlarmState = "ok" | "alarm" | "unknown";

export interface RowAlarms {
  purchaseCost: AlarmState;
  packing: AlarmState;
  labour: AlarmState;
  transport: AlarmState;
  margin: AlarmState;
  anyAlarm: boolean;
  anyUnknown: boolean;
}

export type AlarmRuleKey = keyof Omit<RowAlarms, "anyAlarm" | "anyUnknown">;

function sumOrNull(...vals: (number | null)[]): number | null {
  if (vals.some((v) => v === null || v === undefined)) return null;
  return vals.reduce<number>((a, b) => a + (b as number), 0);
}

// UNKNOWN whenever an input is missing -- never silently reads as "ok" just
// because a null happened to not exceed a threshold.
// EPSILON absorbs IEEE-754 float noise: Transport is exactly 0.13 *
// AvgUnitPrice under SQL's exact DECIMAL arithmetic, but the same division
// in JS float can land ~1e-17 past the boundary, which a strict `>` would
// wrongly flag as a breach.
const EPSILON = 1e-9;

function evalMax(
  numerator: number | null,
  denominator: number | null,
  max: number
): AlarmState {
  if (numerator === null || denominator === null || denominator === 0) {
    return "unknown";
  }
  return numerator / denominator > max + EPSILON ? "alarm" : "ok";
}

export function evaluateAlarms(row: SalesRow): RowAlarms {
  const denom = row.AvgUnitPrice;

  const purchaseCost = evalMax(row.FinalPurPrice, denom, THRESHOLDS.PURCHASE_COST_MAX);
  const packing = evalMax(
    sumOrNull(row.Packing, row.Sticker, row.Box),
    denom,
    THRESHOLDS.PACKING_MAX
  );
  const labour = evalMax(
    sumOrNull(row.LabourProd, row.LabourRepack, row.LabourAssembler),
    denom,
    THRESHOLDS.LABOUR_MAX
  );
  const transport = evalMax(row.Transport, denom, THRESHOLDS.TRANSPORT_MAX);
  const margin: AlarmState =
    row.GrossMargin === null
      ? "unknown"
      : row.GrossMargin < THRESHOLDS.MIN_GROSS_MARGIN - EPSILON
      ? "alarm"
      : "ok";

  const all: AlarmState[] = [purchaseCost, packing, labour, transport, margin];
  return {
    purchaseCost,
    packing,
    labour,
    transport,
    margin,
    anyAlarm: all.includes("alarm"),
    anyUnknown: all.includes("unknown"),
  };
}
