import { Package, UserPlus, MapPin, Users2, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { SalesRowMode } from "../model/recompute";
import { cn } from "@/shared/lib/utils";

// Stays pinned under the picker for the whole session so the numbers below
// are always paired with which Variety/Customer/Warehouse they describe.
export function QuoteSimulatorIdentityBar({
  row,
  mode,
  blendSummary,
  isNewCustomerQuote,
}: {
  row: SalesRow;
  mode: SalesRowMode;
  blendSummary?: string;
  isNewCustomerQuote?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-gradient-to-br p-5 sm:flex-row sm:items-center sm:justify-between",
        isNewCustomerQuote ? "from-[var(--chart-2)]/10 via-[var(--chart-2)]/5 to-transparent" : "from-primary/10 via-primary/5 to-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm",
            isNewCustomerQuote ? "bg-[var(--chart-2)]" : "bg-primary"
          )}
        >
          {isNewCustomerQuote ? <UserPlus className="size-5.5" aria-hidden="true" /> : <Package className="size-5.5" aria-hidden="true" />}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {isNewCustomerQuote ? t("grossMargin.simulator.identity.quotingNewCustomer") : t("grossMargin.simulator.identity.quoting")}
            {isNewCustomerQuote && (
              <span className="rounded-md bg-[var(--chart-2)]/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--chart-2)]">
                {t("grossMargin.simulator.identity.newCustomer")}
              </span>
            )}
          </p>
          <h3 className="text-base font-semibold leading-snug">{row.Variety}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users2 className="size-3.5" aria-hidden="true" />
              {row.Customer}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {row.Warehouse}
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <Tag className="size-3.5" aria-hidden="true" />
              {row.SKUMeasure}
            </span>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-card/80 px-4 py-2.5 text-sm shadow-sm sm:max-w-xs">
        <p className="font-medium text-foreground">{t(`grossMargin.simulator.modes.${mode}.plain`)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(`grossMargin.simulator.modes.${mode}.description`)}</p>
        {blendSummary && <p className="mt-1 text-xs text-muted-foreground">{blendSummary}</p>}
      </div>
    </div>
  );
}
