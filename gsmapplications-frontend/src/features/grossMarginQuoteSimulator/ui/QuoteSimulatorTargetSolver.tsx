import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Target, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";
import { decimalInputProps, parseDecimal } from "@/shared/lib/formValidation";
import { formatCurrency, formatPercent, formatNumber } from "@/shared/lib/format";
import { decimalPlaces, formatByFieldFormat } from "../model/quoteFields";
import { buildBootstrapPriceSuggestion, buildTargetMarginSuggestions, type QuoteOverrides, type RecomputeInputs, type SalesRowMode } from "../model/recompute";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import { THRESHOLDS, THRESHOLD_LABELS } from "@/shared/lib/thresholds";
import { useQuoteFields } from "../model/useQuoteFields";
import { cn } from "@/shared/lib/utils";

// Answers the reverse of "Adjust the inputs": not "what happens if I change
// X" but "what would I have to change to hit a margin I want." Every
// suggestion is a single independent lever (see buildTargetMarginSuggestions),
// so the user picks the most realistic single ask for this negotiation.
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
  const { t } = useTranslation();
  // Defaults to 25%, NOT reused from THRESHOLDS.MIN_GROSS_MARGIN (the
  // unrelated 20% company alarm floor used elsewhere). Fully editable.
  const [targetText, setTargetText] = useState("25");

  const canNegotiatePallet =
    transportCost !== null &&
    transportCost.TransportUnitCost !== null &&
    transportCost.Qty !== null &&
    transportCost.BoxesXPallet !== null;

  const fields = useQuoteFields(commissionType, mode, { transportMode, canNegotiatePallet });

  const parsedTarget = parseDecimal(targetText);
  const targetValue = typeof parsedTarget === "number" ? parsedTarget / 100 : null;
  const targetValid = targetValue !== null && Number.isFinite(targetValue);

  // Rounded to each field's own step precision -- the bisection search
  // converges to ~15 floating-point digits, unreadable and hard to hand-edit
  // if applied verbatim.
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

  // For a brand-new manual quote, GrossMargin is null until both price and
  // cost exist. If cost is already known, bootstrap a starting List Price
  // suggestion instead; once applied, GrossMargin becomes non-null and the
  // normal solver below takes over automatically.
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
            <CardTitle>{t("grossMargin.simulator.target.title")}</CardTitle>
            <CardDescription>{t("grossMargin.simulator.target.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("grossMargin.simulator.target.targetLabel")}>
            <div className="relative w-36">
              <Input
                {...decimalInputProps}
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder={currentGrossMargin !== null ? formatNumber(currentGrossMargin * 100, 1) : "e.g. 20"}
                className="pr-7"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">%</span>
            </div>
          </Field>
          <button
            type="button"
            onClick={() => setTargetText(formatNumber(THRESHOLDS.MIN_GROSS_MARGIN * 100, 0))}
            className="h-8 rounded-lg border border-input px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("grossMargin.simulator.target.useFloor", { floor: THRESHOLD_LABELS.margin })}
          </button>
          {transportMode === "pallet" && (
            <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.target.palletNote")}</p>
          )}
        </div>

        {!targetValid && (
          <p className="text-sm text-muted-foreground">{t("grossMargin.simulator.target.enterTarget")}</p>
        )}

        {targetValid && currentGrossMargin === null && bootstrap && bootstrap.suggestedListPrice !== null && (
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("grossMargin.simulator.fields.avgUnitPriceBase")}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {t("grossMargin.simulator.target.noPriceYet")}
                <ArrowRight className="size-3" aria-hidden="true" />
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(bootstrap.suggestedListPrice)}
                </span>
                {t("grossMargin.simulator.target.toStartAt", { target: formatPercent(targetValue) })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => apply("avgUnitPriceBaseOverride", bootstrap.suggestedListPrice!)}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {t("grossMargin.simulator.target.apply")}
            </button>
          </div>
        )}

        {targetValid && currentGrossMargin === null && bootstrap && bootstrap.suggestedListPrice === null && (
          <p className="text-sm text-muted-foreground">
            {targetValue! >= 1 ? t("grossMargin.simulator.target.unreachable100") : t("grossMargin.simulator.target.notReachable")}
          </p>
        )}

        {targetValid && currentGrossMargin === null && !bootstrap && (
          <p className="text-sm text-muted-foreground">
            {t("grossMargin.simulator.target.enterCostsFirst", { target: formatPercent(targetValue) })}
          </p>
        )}

        {targetValid && currentGrossMargin !== null && alreadyThere && (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            {t("grossMargin.simulator.target.alreadyThere", { target: formatPercent(targetValue) })}
          </div>
        )}

        {targetValid && currentGrossMargin !== null && !alreadyThere && (
          <div className="space-y-2">
            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("grossMargin.simulator.target.notEnoughData")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.target.notReachable")}</p>
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
