"use client";

import { useState } from "react";
import { ChevronDown, Calculator } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/shared/ui/collapsible";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import type { SalesRowMode } from "../model/recompute";
import { cn } from "@/shared/lib/utils";

// Plain-language "how we got this number" walkthrough -- lets the user
// verify the simulator's math against the real formula, per the spec's
// "Calculation Details" requirement. Mode-aware: shows exactly the terms
// that actually apply to this row, in the same order lib/recompute.ts and
// sql/15_sales.sql sum them in.
export function QuoteSimulatorTransparencyPanel({
  row,
  mode,
  avgUnitPriceBase,
}: {
  row: SalesRow;
  mode: SalesRowMode;
  avgUnitPriceBase: number | null;
}) {
  const [open, setOpen] = useState(false);

  const costTerms: { label: string; value: number | null }[] =
    mode === "C"
      ? [
          { label: "Blended Purchase Cost (whole pack)", value: row.FinalPurPrice },
          { label: "Box (whole pack)", value: row.Box },
          { label: "Transport (whole pack)", value: row.Transport },
        ]
      : [
          { label: "Final Purchase Price", value: row.FinalPurPrice },
          { label: "Packing", value: row.Packing },
          { label: "Sticker", value: row.Sticker },
          { label: "Box", value: row.Box },
          { label: "Labour — Production", value: row.LabourProd },
          { label: "Labour — Repack", value: row.LabourRepack },
          { label: "Labour — Assembler", value: row.LabourAssembler },
          { label: "Transport", value: row.Transport },
        ];

  const applicableTerms = costTerms.filter((t) => t.value !== null);

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
            <p className="text-sm font-semibold">How this was calculated</p>
            <p className="text-xs text-muted-foreground">
              See the exact formula behind the Scenario numbers above — same math as production.
            </p>
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
            <p className="mb-2 font-semibold">1. Avg Sales Unit Price</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              <p>List Price ({formatCurrency(avgUnitPriceBase)}) − Rebate − Commission = {formatCurrency(row.AvgUnitPrice)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">2. Final Unit Cost</p>
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              {applicableTerms.map((t, i) => (
                <p key={t.label}>
                  {i > 0 && "+ "}
                  {t.label} = {formatCurrency(t.value)}
                </p>
              ))}
              <div className="mt-1 border-t border-border pt-1 font-semibold">
                = {formatCurrency(row.FinalUnitCost)}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">3. Cost Ratio &amp; Gross Margin</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              <p>
                Cost Ratio = {formatCurrency(row.FinalUnitCost)} ÷ {formatCurrency(row.AvgUnitPrice)} = {formatPercent(row.CostRatio)}
              </p>
              <p className="mt-1">
                Gross Margin = ({formatCurrency(row.AvgUnitPrice)} − {formatCurrency(row.FinalUnitCost)}) ÷ {formatCurrency(row.AvgUnitPrice)} = {formatPercent(row.GrossMargin)}
              </p>
            </div>
          </div>

          {mode === "C" && (
            <p className="text-xs text-muted-foreground">
              This is a mixed-herb blend — Blended Purchase Cost already includes every component
              herb&apos;s own price plus its share of packaging/labour, folded in per-child by the
              production pipeline. See the composition below.
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
