import type { SalesRowMode } from "./recompute";
import { formatCurrency, formatPercent, formatNumber } from "@/shared/lib/format";

// Single source of truth for which QuoteOverrides fields apply to which
// SalesRowMode, and how to label/format/step them. Shared by the inputs
// panel (renders these as editable fields) AND the tornado/sensitivity
// chart (walks the same list to know what's "a variable" for a given row)
// -- so the two can never drift out of sync with each other.

export interface QuoteFieldMeta {
  key: string; // matches a key on QuoteOverrides
  label: string;
  group: "price" | "cost";
  format: "currency" | "percent" | "number";
  step: string;
  // Only true for fields that are genuinely per-unit in every mode they
  // appear in (Mode A/B's Box and Transport) -- lets the inputs panel offer
  // a "I have a whole-pack cost" toggle that converts on entry, without
  // ever changing what QuoteOverrides itself stores (always per-unit).
  // Deliberately NOT set on Mode C's Box/Transport (already whole-pack by
  // definition -- see their "(whole pack)" labels below) or
  // palletCostOverride (a different unit entirely, per pallet not per pack).
  supportsWholePackEntry?: boolean;
}

// Price-side fields are universal across every mode -- Rebate and Commission
// both always appear, even on a row with no RebateRow/CommissionRow on file
// at all (defaulting to $0/0%), so a user can model "what if we started
// charging one," not just tune one that already exists. Which Commission
// field (% vs $) applies follows the matched CommissionRow's own type when
// there is one; percent is the default shape otherwise -- the vast majority
// of commissions in this data are percent-based, and a $ override is still
// reachable by switching commissionType if that ever turns out wrong.
export function getPriceFields(commissionType: "percent" | "value" | null): QuoteFieldMeta[] {
  const fields: QuoteFieldMeta[] = [
    { key: "avgUnitPriceBaseOverride", label: "List Price (before Rebate/Commission)", group: "price", format: "currency", step: "0.001" },
    { key: "rebateOverride", label: "Rebate", group: "price", format: "currency", step: "0.001" },
  ];
  if (commissionType === "value") {
    fields.push({ key: "commissionValueOverride", label: "Commission $", group: "price", format: "currency", step: "0.001" });
  } else {
    fields.push({ key: "commissionPercentOverride", label: "Commission %", group: "price", format: "percent", step: "0.001" });
  }
  return fields;
}

// How many decimal places a field's own step implies -- e.g. "0.001" -> 3.
// Shared so the inputs panel's stepper buttons and the target-margin
// solver's suggested values round to the same precision a person would
// actually type, instead of the solver's bisection search leaving 15
// floating-point digits in an applied override.
export function decimalPlaces(step: string): number {
  const idx = step.indexOf(".");
  return idx === -1 ? 0 : step.length - idx - 1;
}

// Same rules setField()/the target-margin solver both need to enforce a
// suggested or typed value against -- $ fields >= 0, commission % in [0,1),
// yield strictly > 0 (0 isn't a real physical yield). Single source of
// truth so the solver never suggests a value the input field would reject.
export function validateFieldValue(key: string, value: number): string | null {
  if (key === "commissionPercentOverride") {
    if (value < 0 || value >= 1) return "Must be between 0% and 100%.";
    return null;
  }
  if (key === "yieldOverride") {
    if (value <= 0) return "Yield must be greater than 0.";
    return null;
  }
  if (value < 0) return "Can't be negative.";
  return null;
}

// Cost-side fields depend entirely on the row's mode -- mirrors the exact
// same A/B/C branching in lib/recompute.ts. "none" mode has no cost basis
// at all, so it gets nothing here (matches the inputs panel hiding
// cost-side inputs entirely rather than showing disabled ones).
export function getCostFields(mode: SalesRowMode): QuoteFieldMeta[] {
  const wholePackEligibleTransport: QuoteFieldMeta = {
    key: "transportOverride",
    label: "Transport",
    group: "cost",
    format: "currency",
    step: "0.001",
    supportsWholePackEntry: true,
  };
  const wholePackTransport: QuoteFieldMeta = {
    key: "transportOverride",
    label: "Transport (whole pack)",
    group: "cost",
    format: "currency",
    step: "0.001",
  };

  if (mode === "A") {
    return [
      { key: "purchaseCostOverride", label: "Purchase Cost", group: "cost", format: "currency", step: "0.001" },
      { key: "boxOverride", label: "Box", group: "cost", format: "currency", step: "0.001", supportsWholePackEntry: true },
      { key: "labourRepackOverride", label: "Labour — Repack", group: "cost", format: "currency", step: "0.001" },
      { key: "labourAssemblerOverride", label: "Labour — Assembler", group: "cost", format: "currency", step: "0.001" },
      wholePackEligibleTransport,
    ];
  }
  if (mode === "B") {
    return [
      { key: "purchaseCostOverride", label: "Purchase Cost ($/lb)", group: "cost", format: "currency", step: "0.001" },
      { key: "yieldOverride", label: "Yield", group: "cost", format: "number", step: "0.1" },
      { key: "packingOverride", label: "Packing", group: "cost", format: "currency", step: "0.001" },
      { key: "stickerOverride", label: "Sticker", group: "cost", format: "currency", step: "0.001" },
      { key: "labourProdOverride", label: "Labour — Production", group: "cost", format: "currency", step: "0.001" },
      // Added 2026-08-19 alongside recompute.ts's matching fix -- Flag=0
      // (Mode B) now gets LabourRepack from CostReference too, not just
      // Flag=1 (Mode A).
      { key: "labourRepackOverride", label: "Labour — Repack", group: "cost", format: "currency", step: "0.001" },
      { key: "boxOverride", label: "Box", group: "cost", format: "currency", step: "0.001", supportsWholePackEntry: true },
      { key: "labourAssemblerOverride", label: "Labour — Assembler", group: "cost", format: "currency", step: "0.001" },
      wholePackEligibleTransport,
    ];
  }
  if (mode === "C") {
    return [
      { key: "mixedHerbFinalPurPriceOverride", label: "Blended Purchase Cost (whole pack)", group: "cost", format: "currency", step: "0.001" },
      { key: "boxOverride", label: "Box (whole pack)", group: "cost", format: "currency", step: "0.001" },
      wholePackTransport,
    ];
  }
  return [];
}

// The one piece of getCostFieldsForTransportMode's own filtering that
// quote-simulator-inputs-panel.tsx also needs directly -- it renders Pallet
// Cost via its own separate JSX block (with a Qty × Boxes/Pallet note this
// generic field list doesn't carry), not through the array this function
// returns, so it wants the same exclusion without the field being appended.
export function excludingPalletNegotiatedTransport(
  fields: QuoteFieldMeta[],
  transportMode: "direct" | "pallet"
): QuoteFieldMeta[] {
  return fields.filter((f) => !(f.key === "transportOverride" && transportMode === "pallet"));
}

// Swaps the direct-$ Transport field for a Pallet Cost field when the user
// has toggled "Negotiate Pallet Cost" -- shared by the inputs panel and the
// target-margin solver so both ever offer exactly the same lever, never one
// suggesting a move to a field the other isn't even showing.
export function getCostFieldsForTransportMode(
  mode: SalesRowMode,
  transportMode: "direct" | "pallet",
  canNegotiatePallet: boolean
): QuoteFieldMeta[] {
  const fields = excludingPalletNegotiatedTransport(getCostFields(mode), transportMode);
  if (transportMode === "pallet" && canNegotiatePallet) {
    fields.push({ key: "palletCostOverride", label: "Pallet Cost", group: "cost", format: "currency", step: "0.01" });
  }
  return fields;
}

// Shared by every consumer of QuoteFieldMeta that renders a value according
// to its own `format` -- the inputs panel's placeholder, and every chart
// that labels a field's value (negotiation headroom, driver impact, the
// target solver). REFACTOR_PLAN.md phase 02.
export function formatByFieldFormat(format: QuoteFieldMeta["format"], value: number | null): string {
  if (format === "percent") return formatPercent(value);
  if (format === "number") return formatNumber(value);
  return formatCurrency(value);
}
