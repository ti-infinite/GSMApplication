import type { CarrierSlot, LogisticsRow } from "./types";

// Five days before the ship date it is already late to book a truck.
export const ALARM_LEAD_DAYS = 5;

export type CarrierStatus = "confirmed" | "alarm" | "pending";

/** Parses a YYYY-MM-DD string as a local calendar date (no time-zone shift). */
export function parseShipDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Whole days from today to the ship date; negative when it has passed. */
export function daysUntilShip(row: LogisticsRow, today = new Date()): number | null {
  const ship = parseShipDate(row.DateShip);
  if (!ship) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((ship.getTime() - start.getTime()) / 86_400_000);
}

// The confirmation is stored as the carrier's name, so it is matched back to its slot.
export function confirmedSlot(row: LogisticsRow): CarrierSlot | null {
  if (!row.ConfirmedCarrier) return null;
  if (row.CarrierA && row.ConfirmedCarrier === row.CarrierA) return "A";
  if (row.CarrierB && row.ConfirmedCarrier === row.CarrierB) return "B";
  return null;
}

export function carrierStatus(row: LogisticsRow, today = new Date()): CarrierStatus {
  if (row.ConfirmedCarrier) return "confirmed";
  const days = daysUntilShip(row, today);
  if (days !== null && days <= ALARM_LEAD_DAYS) return "alarm";
  return "pending";
}
