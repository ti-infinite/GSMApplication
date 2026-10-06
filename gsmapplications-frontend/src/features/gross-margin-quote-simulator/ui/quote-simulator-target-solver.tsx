"use client";

import { useMemo, useState } from "react";
import { Target, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { formatCurrency, formatPercent, formatNumber } from "@/shared/lib/format";
import { decimalPlaces, formatByFieldFormat } from "../model/quote-fields";
import { buildBootstrapPriceSuggestion, buildTargetMarginSuggestions, type QuoteOverrides, type RecomputeInputs, type SalesRowMode } from "../model/recompute";
import type { TransportCostRow } from "@/entities/gross-margin-transport-cost";
import { THRESHOLDS } from "@/shared/lib/thresholds";
import { useQuoteFields } from "../model/use-quote-fields";
import { cn } from "@/shared/lib/utils";

// A separate, standalone tool from "Adjust the inputs" -- that card answers
// "what happens if I change X"; this one answers the reverse question,
// "what would I have to change to hit a margin I want." Every suggestion is
// a single independent lever (see buildTargetMarginSuggestions' own doc
// comment for why not a joint optimizer), so the user picks whichever is
// the most realistic ask for THIS negotiation, not an algorithmically
// optimal blend of six simultaneous ones.
export function QuoteSimulatorTargetSolver({
  mode,
  commissionType,
  inputs,
  overrides,
  onChange,
  transportMode,
  transportCost,
  currentGrossMargin,
}: {
  mode: SalesRowMode;
  commissionType: "percent" | "value" | null;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
  onChange: (next: QuoteOverrides) => void;
  transportMode: "direct" | "pallet";
  transportCost: TransportCostRow | null;
  currentGrossMargin: number | null;
}) {
  // Defaults to 25% -- a UI starting point per the team's request, NOT
  // reused from THRESHOLDS.MIN_GROSS_MARGIN (that's the unrelated 20%
  // company alarm floor used elsewhere). Fully editable.
  const [targetText, setTargetText] = useState("25");

  const canNegotiatePallet =
    transportCost !== null &&
    transportCost.TransportUnitCost !== null &&
    transportCost.Qty !== null &&
    transportCost.BoxesXPallet !== null;

  const fields = useQuoteFields(commissionType, mode, { transportMode, canNegotiatePallet });

  const targetValue = targetText === "" ? null : Number(targetText) / 100;
  const targetValid = targetValue !== null && Number.isFinite(targetValue);

  // Rounded to each field's own step precision -- the bisection search that
  // produces suggestedValue converges to ~15 floating-point digits, which is
  // both unreadable and, if applied verbatim, harder to then hand-edit than
  // a number a person would actually type (e.g. "$1.020", not
  // "$1.019814622076165").
  const suggestions = useMemo(() => {
    if (!targetValid) return [];
    const raw = buildTargetMarginSuggestions(inputs, overrides, fields, targetValue!);
    const stepByKey = new Map(fields.map((f) => [f.key, f.step]));
    return raw.map((s) => {
      if (s.suggestedValue === null) return s;
      const places = decimalPlaces(stepByKey.get(s.key) ?? "0.001");
      const factor = 10 ** places;
      return { ...s, suggestedValue: Math.round(s.suggestedValue * factor) / factor };
    });
  }, [inputs, overrides, fields, targetValid, targetValue]);

  const alreadyThere =
    targetValid && currentGrossMargin !== null && Math.abs(currentGrossMargin - targetValue!) < 0.0005;

  // For a brand-new manual quote, GrossMargin is null until BOTH price and
  // cost exist -- there's no "current" state for the normal multi-lever
  // solver to search from. If the cost side IS already known, bootstrap a
  // single starting List Price suggestion instead of just saying "fix that
  // first." Once applied (or the user types any price by hand), GrossMargin
  // becomes non-null on the next render and the normal solver below takes
  // over automatically -- no separate handoff state needed.
  const bootstrap = useMemo(() => {
    if (!targetValid || currentGrossMargin !== null) return null;
    return buildBootstrapPriceSuggestion(inputs, overrides, targetValue!);
  }, [inputs, overrides, targetValid, currentGrossMargin, targetValue]);

  function apply(key: string, value: number) {
    onChange({ ...overrides, [key]: value } as QuoteOverrides);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Work backward from a margin</CardTitle>
            <CardDescription>
              Say what Gross Margin you want — this suggests, one lever at a time, the real value
              that would get you there.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Target Gross Margin</label>
            <div className="relative w-36">
              <Input
                type="number"
                step="0.1"
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder={currentGrossMargin !== null ? formatNumber(currentGrossMargin * 100, 1) : "e.g. 20"}
                className="pr-7"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTargetText(formatNumber(THRESHOLDS.MIN_GROSS_MARGIN * 100, 0))}
            className="h-8 rounded-lg border border-input px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Use the 20% floor
          </button>
          {transportMode === "pallet" && (
            <p className="text-xs text-muted-foreground">
              Transport lever: <span className="font-medium text-foreground">Pallet Cost</span> (matches the
              &quot;Negotiate Pallet Cost&quot; toggle in Adjust the inputs)
            </p>
          )}
        </div>

        {!targetValid && (
          <p className="text-sm text-muted-foreground">Enter a target above to see suggestions.</p>
        )}

        {targetValid && currentGrossMargin === null && bootstrap && bootstrap.suggestedListPrice !== null && (
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">List Price (before Rebate/Commission)</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                No price yet
                <ArrowRight className="size-3" aria-hidden="true" />
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(bootstrap.suggestedListPrice)}
                </span>
                to start at {formatPercent(targetValue)} margin
              </p>
            </div>
            <button
              type="button"
              onClick={() => apply("avgUnitPriceBaseOverride", bootstrap.suggestedListPrice!)}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Apply
            </button>
          </div>
        )}

        {targetValid && currentGrossMargin === null && bootstrap && bootstrap.suggestedListPrice === null && (
          <p className="text-sm text-muted-foreground">
            {targetValue! >= 1
              ? "A margin of 100% or more isn't achievable — every price would need to be infinite."
              : "Not reachable by this lever alone within a sane range."}
          </p>
        )}

        {targetValid && currentGrossMargin === null && !bootstrap && (
          <p className="text-sm text-muted-foreground">
            Enter the cost fields below first — once a cost is known, this can suggest a starting
            price for the {formatPercent(targetValue)} target.
          </p>
        )}

        {targetValid && currentGrossMargin !== null && alreadyThere && (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            You&apos;re already at {formatPercent(targetValue)} — no changes needed.
          </div>
        )}

        {targetValid && currentGrossMargin !== null && !alreadyThere && (
          <div className="space-y-2">
            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">Not enough data on this row to suggest anything.</p>
            )}
            {suggestions.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  {s.suggestedValue !== null ? (
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {formatByFieldFormat(s.format, s.currentValue)}
                      <ArrowRight className="size-3" aria-hidden="true" />
                      <span className="font-mono font-semibold text-foreground">{formatByFieldFormat(s.format, s.suggestedValue)}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not reachable by this lever alone within a sane range.</p>
                  )}
                </div>
                {s.suggestedValue !== null && (
                  <button
                    type="button"
                    onClick={() => apply(s.key, s.suggestedValue!)}
                    className={cn(
                      "shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    )}
                  >
                    Apply
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
