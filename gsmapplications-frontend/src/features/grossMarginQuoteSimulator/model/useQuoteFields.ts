import { useMemo } from "react";
import type { SalesRowMode } from "./recompute";
import { getPriceFields, getCostFields, getCostFieldsForTransportMode, type QuoteFieldMeta } from "./quoteFields";

// The repeated "[...price fields, ...cost fields]" construction duplicated
// across the negotiation-headroom chart, the driver-impact chart, and the
// target-margin solver -- each walks the exact same combined field list to
// know what's "a variable" for a given row. `transportOptions` selects the
// pallet-aware variant (only the target solver needs it); omit it for the
// plain `getCostFields(mode)` the two charts use. REFACTOR_PLAN.md phase 02.
export function useQuoteFields(
  commissionType: "percent" | "value" | null,
  mode: SalesRowMode,
  transportOptions?: { transportMode: "direct" | "pallet"; canNegotiatePallet: boolean }
): QuoteFieldMeta[] {
  return useMemo(() => {
    const costFields = transportOptions
      ? getCostFieldsForTransportMode(mode, transportOptions.transportMode, transportOptions.canNegotiatePallet)
      : getCostFields(mode);
    return [...getPriceFields(commissionType), ...costFields];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- destructured below instead of depending on the options object's identity
  }, [commissionType, mode, transportOptions?.transportMode, transportOptions?.canNegotiatePallet]);
}
