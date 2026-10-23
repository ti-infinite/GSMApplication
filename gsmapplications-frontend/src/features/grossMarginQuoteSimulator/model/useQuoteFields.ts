import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SalesRowMode } from "./recompute";
import { getPriceFields, getCostFields, getCostFieldsForTransportMode, type QuoteFieldMeta } from "./quoteFields";

// Shared "[...price fields, ...cost fields]" list, used by every chart/solver
// that needs to know what's "a variable" for a given row. `transportOptions`
// selects the pallet-aware variant; omit it for the plain `getCostFields(mode)`.
// Labels come back translated.
export function useQuoteFields(
  commissionType: "percent" | "value" | null,
  mode: SalesRowMode,
  transportOptions?: { transportMode: "direct" | "pallet"; canNegotiatePallet: boolean }
): QuoteFieldMeta[] {
  const { t } = useTranslation();
  return useMemo(() => {
    const L = (key: string) => t(`grossMargin.simulator.fields.${key}`);
    const costFields = transportOptions
      ? getCostFieldsForTransportMode(mode, transportOptions.transportMode, transportOptions.canNegotiatePallet, L)
      : getCostFields(mode, L);
    return [...getPriceFields(commissionType, L), ...costFields];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- destructured below instead of depending on the options object's identity
  }, [commissionType, mode, transportOptions?.transportMode, transportOptions?.canNegotiatePallet, t]);
}
