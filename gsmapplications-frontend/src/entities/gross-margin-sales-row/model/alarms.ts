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

export const ALARM_LABELS: Record<AlarmRuleKey, string> = {
  purchaseCost: "Purchase Cost > 42%",
  packing: "Packing + Sticker + Box > 8%",
  labour: "Labour (Prod + Repack + Assembler) > 17%",
  transport: "Transport > 13%",
  margin: "Gross Margin < 20%",
};

function sumOrNull(...vals: (number | null)[]): number | null {
  if (vals.some((v) => v === null || v === undefined)) return null;
  return vals.reduce<number>((a, b) => a + (b as number), 0);
}

// UNKNOWN whenever an input is missing -- never silently reads as "ok" just
// because a null happened to not exceed a threshold. Mirrors the SQL
// pipeline's own never-guess precedent (see gross-margin-pipeline/README.md).
// BUG FIX (2026-07-17, caught by the user): Transport is defined in the SQL
// as EXACTLY 0.13 * AvgUnitPrice, so Transport/AvgUnitPrice should always
// land precisely on the 13% boundary, never over it. It was reading "alarm"
// on 22/150 rows anyway -- confirmed via direct SQL (0 rows exceed 0.13
// there, since DECIMAL arithmetic is exact) that this was JS floating-point
// representation error, not real data: e.g. 0.20908333333333334 /
// 1.6083333333333332 evaluates to 0.13000000000000003 in IEEE-754 double
// precision, ~3e-17 off from the true 0.13, which a strict `>` treats as a
// breach. EPSILON absorbs float noise at that scale while still catching any
// real difference (anything more than a millionth over the threshold).
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
