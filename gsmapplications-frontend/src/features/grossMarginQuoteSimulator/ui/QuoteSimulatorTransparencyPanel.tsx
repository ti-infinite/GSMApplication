import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Calculator } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/shared/ui/collapsible";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { SalesRowMode } from "../model/recompute";
import { cn } from "@/shared/lib/utils";

// Plain-language "how we got this number" walkthrough, mode-aware: shows
// exactly the terms that apply to this row, in the same order recompute.ts
// and sql/15_sales.sql sum them in.
export function QuoteSimulatorTransparencyPanel({
  row,
  mode,
  avgUnitPriceBase,
}: {
  row: SalesRow;
  mode: SalesRowMode;
  avgUnitPriceBase: number | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const T = (key: string) => t(`grossMargin.simulator.transparency.terms.${key}`);

  const costTerms: { label: string; value: number | null }[] =
    mode === "C"
      ? [
          { label: T("blendedPurchaseWholePack"), value: row.FinalPurPrice },
          { label: T("boxWholePack"), value: row.Box },
          { label: T("transportWholePack"), value: row.Transport },
        ]
      : [
          { label: T("finalPurchasePrice"), value: row.FinalPurPrice },
          { label: T("packing"), value: row.Packing },
          { label: T("sticker"), value: row.Sticker },
          { label: T("box"), value: row.Box },
          { label: T("labourProd"), value: row.LabourProd },
          { label: T("labourRepack"), value: row.LabourRepack },
          { label: T("labourAssembler"), value: row.LabourAssembler },
          { label: T("transport"), value: row.Transport },
        ];

  const applicableTerms = costTerms.filter((term) => term.value !== null);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border bg-card shadow-sm">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-muted/40",
          open && "rounded-b-none border-b"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calculator className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("grossMargin.simulator.transparency.title")}</p>
            <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.transparency.subtitle")}</p>
          </div>
        </div>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-6 p-5 text-sm">
          <div>
            <p className="mb-2 font-semibold">{t("grossMargin.simulator.transparency.step1")}</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              <p>
                {t("grossMargin.simulator.transparency.listPrice")} ({formatCurrency(avgUnitPriceBase)}) − {t("grossMargin.simulator.transparency.rebate")} − {t("grossMargin.simulator.transparency.commission")} = {formatCurrency(row.AvgUnitPrice)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">{t("grossMargin.simulator.transparency.step2")}</p>
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              {applicableTerms.map((term, i) => (
                <p key={term.label}>
                  {i > 0 && "+ "}
                  {term.label} = {formatCurrency(term.value)}
                </p>
              ))}
              <div className="mt-1 border-t border-border pt-1 font-semibold">
                = {formatCurrency(row.FinalUnitCost)}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">{t("grossMargin.simulator.transparency.step3")}</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              <p>
                {t("grossMargin.simulator.transparency.costRatio")} = {formatCurrency(row.FinalUnitCost)} ÷ {formatCurrency(row.AvgUnitPrice)} = {formatPercent(row.CostRatio)}
              </p>
              <p className="mt-1">
                {t("grossMargin.simulator.transparency.grossMargin")} = ({formatCurrency(row.AvgUnitPrice)} − {formatCurrency(row.FinalUnitCost)}) ÷ {formatCurrency(row.AvgUnitPrice)} = {formatPercent(row.GrossMargin)}
              </p>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
