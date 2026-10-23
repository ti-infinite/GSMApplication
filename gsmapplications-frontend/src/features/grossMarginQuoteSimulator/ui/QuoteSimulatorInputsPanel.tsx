import { useEffect, useState } from "react";
import { RotateCcw, SlidersHorizontal, DollarSign, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Field, FieldToggle } from "@/shared/ui/field";
import { decimalInputProps } from "@/shared/lib/formValidation";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import {
  buildBootstrapPriceSuggestion,
  getCurrentFieldValue,
  type SalesRowMode,
  type QuoteOverrides,
  type RecomputeInputs,
} from "../model/recompute";
import { ESTIMATE_KEY_BY_OVERRIDE, hasEstimatedFields, type FieldEstimate, type QuoteCostEstimates } from "../model/quoteCostEstimates";
import { decimalPlaces } from "../model/quoteFields";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { parseDecimal } from "@/shared/lib/formValidation";
import {
  excludingPalletNegotiatedTransport,
  formatByFieldFormat,
  getCostFields,
  getPriceFields,
  type QuoteFieldMeta,
} from "../model/quoteFields";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

const PRICE_KEY = "avgUnitPriceBaseOverride";

function roundToStep(value: number, step: string): number {
  const factor = 10 ** decimalPlaces(step);
  return Math.round(value * factor) / factor;
}
import { useQuoteFieldEditor } from "../model/useQuoteFieldEditor";


function baselineValue(key: string, inputs: RecomputeInputs, avgUnitPriceBase: number | null): number | null {
  return getCurrentFieldValue(key, inputs, {}, avgUnitPriceBase);
}


const HIDE_NATIVE_SPINNER = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function Stepper({
  onStep,
  labelPrefix,
}: {
  onStep: (direction: 1 | -1) => void;
  labelPrefix: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-y-0 right-0 flex w-6 flex-col overflow-hidden rounded-r-lg border-l border-input">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("grossMargin.simulator.inputs.increase", { label: labelPrefix })}
        onClick={() => onStep(1)}
        className="flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronUp className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("grossMargin.simulator.inputs.decrease", { label: labelPrefix })}
        onClick={() => onStep(-1)}
        className="flex flex-1 items-center justify-center border-t border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronDown className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function QuoteSimulatorInputsPanel({
  mode,
  commission,
  transportCost,
  overrides,
  onChange,
  inputs,
  avgUnitPriceBase,
  transportMode,
  onTransportModeChange,
  onModeSelect,
  sourcingSwitchable,
  estimates,
  currentGrossMargin,
  finalUnitCost,
}: {
  mode: SalesRowMode;
  commission: CommissionRow | null;
  transportCost: TransportCostRow | null;
  overrides: QuoteOverrides;
  onChange: (next: QuoteOverrides) => void;
  inputs: RecomputeInputs;
  avgUnitPriceBase: number | null;
  transportMode: "direct" | "pallet";
  onTransportModeChange: (mode: "direct" | "pallet") => void;

  onModeSelect?: (mode: "A" | "B") => void;

  sourcingSwitchable?: boolean;

  estimates?: QuoteCostEstimates | null;

  currentGrossMargin?: number | null;
  finalUnitCost?: number | null;
}) {
  const { t } = useTranslation();
  const { packQty, errors, wholePackFields, displayValue, setField, resetField, resetAll, toggleWholePack, stepValue } =
    useQuoteFieldEditor({ inputs, overrides, onChange, onTransportModeChange });
  const L = (key: string) => t(`grossMargin.simulator.fields.${key}`);


  const marginEnabled = typeof finalUnitCost === "number" && finalUnitCost > 0;
  const [priceEntry, setPriceEntry] = useState<"price" | "margin">("price");
  const [marginDraft, setMarginDraft] = useState<string | null>(null);
  const [marginError, setMarginError] = useState<string | null>(null);
  useEffect(() => {
    if (!marginEnabled && priceEntry === "margin") setPriceEntry("price");
  }, [marginEnabled, priceEntry]);

  function applyMargin(text: string, field: QuoteFieldMeta) {
    setMarginDraft(text);
    const parsed = parseDecimal(text);
    if (parsed === null) {
      setMarginError(null);
      resetField(PRICE_KEY);
      return;
    }
    if (typeof parsed !== "number") {
      setMarginError(t("grossMargin.validation.notANumber"));
      return;
    }
    const gm = parsed / 100;
    if (gm >= 1) {
      setMarginError(t("grossMargin.simulator.fieldErrors.marginBelow100"));
      return;
    }
    const { [PRICE_KEY]: _ignored, ...others } = overrides;
    const suggestion = buildBootstrapPriceSuggestion(inputs, others, gm);
    const price = suggestion?.suggestedListPrice ?? null;
    if (price === null || price <= 0) {
      setMarginError(t("grossMargin.simulator.target.notReachable"));
      return;
    }
    setMarginError(null);
    setField(PRICE_KEY, String(roundToStep(price, field.step)), field);
  }

  function estimateFor(key: string): FieldEstimate | null {
    if (!estimates) return null;
    const estKey = ESTIMATE_KEY_BY_OVERRIDE[key];
    return estKey ? (estimates[estKey] as FieldEstimate) : null;
  }

  function estimateBadge(key: string, text: string, base: number | null) {
    const est = estimateFor(key);
    if (!est || key === PRICE_KEY || text !== "") return null;
    if (est.source === "estimated") {
      return (
        <span
          title={t("grossMargin.simulator.estimates.badgeTitle", {
            n: est.sampleSize,
            basis: t(`grossMargin.simulator.estimates.basis.${est.basis}`),
          })}
          className="rounded bg-warning/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-warning"
        >
          {t("grossMargin.simulator.estimates.badge", { n: est.sampleSize })}
        </span>
      );
    }
    if (est.source === "none" && base === null) {
      return <span className="text-[0.65rem] text-muted-foreground">{t("grossMargin.simulator.estimates.noData")}</span>;
    }
    return null;
  }

  const canNegotiatePallet =
    transportCost !== null &&
    transportCost.TransportUnitCost !== null &&
    transportCost.Qty !== null &&
    transportCost.BoxesXPallet !== null;

  const priceFields = getPriceFields(commission?.CommissionType ?? null, L);
  const costFields = excludingPalletNegotiatedTransport(getCostFields(mode, L), transportMode);

  function fieldRow(f: QuoteFieldMeta) {
    const isWholePack = !!(f.supportsWholePackEntry && wholePackFields[f.key] && packQty);
    const text = displayValue(f.key, f);
    const err = errors[f.key];
    const base = baselineValue(f.key, inputs, avgUnitPriceBase);
    const displayBase = isWholePack && base !== null ? base * packQty! : base;
    const showPackToggle = !!(f.supportsWholePackEntry && packQty && packQty > 1);
    const isPriceField = f.key === PRICE_KEY;
    const marginMode = isPriceField && priceEntry === "margin" && marginEnabled;

    if (marginMode) {
      const marginText =
        marginDraft ?? (typeof currentGrossMargin === "number" ? formatNumber(currentGrossMargin * 100, 1) : "");
      return (
        <Field
          key={f.key}
          label={f.label}
          error={marginError}
          labelEnd={
            <div className="flex items-center gap-2">
              <FieldToggle
                value={priceEntry}
                options={[
                  { value: "price", label: t("grossMargin.simulator.inputs.entryPrice") },
                  { value: "margin", label: t("grossMargin.simulator.inputs.entryMargin") },
                ]}
                onChange={(next) => {
                  setPriceEntry(next);
                  setMarginDraft(null);
                  setMarginError(null);
                }}
                ariaLabel={t("grossMargin.simulator.inputs.priceEntryAria")}
              />
              {text !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    resetField(f.key);
                    setMarginDraft(null);
                    setMarginError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title={t("grossMargin.simulator.inputs.resetToBaseline")}
                >
                  <RotateCcw className="size-3" />
                </button>
              )}
            </div>
          }
        >
          <div className="relative">
            <Input
              {...decimalInputProps}
              value={marginText}
              onChange={(e) => applyMargin(e.target.value, f)}
              onBlur={() => setMarginDraft(null)}
              placeholder={typeof currentGrossMargin === "number" ? formatNumber(currentGrossMargin * 100, 1) : "e.g. 30"}
              aria-invalid={!!marginError}
              className="pr-7"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">%</span>
          </div>
          {text !== "" && !marginError && typeof currentGrossMargin === "number" && (
            <p className="text-xs text-muted-foreground">
              {t("grossMargin.simulator.inputs.marginDerivedPrice", {
                price: formatByFieldFormat(f.format, parseDecimal(text) as number | null),
                margin: formatPercent(currentGrossMargin),
              })}
            </p>
          )}
        </Field>
      );
    }

    return (
      <Field
        key={f.key}
        label={f.label}
        error={err}
        labelEnd={
          <div className="flex items-center gap-2">
            {isPriceField &&
              (marginEnabled ? (
                <FieldToggle
                  value={priceEntry}
                  options={[
                    { value: "price", label: t("grossMargin.simulator.inputs.entryPrice") },
                    { value: "margin", label: t("grossMargin.simulator.inputs.entryMargin") },
                  ]}
                  onChange={(next) => {
                    setPriceEntry(next);
                    setMarginDraft(null);
                    setMarginError(null);
                  }}
                  ariaLabel={t("grossMargin.simulator.inputs.priceEntryAria")}
                />
              ) : (
                <span className="text-[0.65rem] text-muted-foreground">{t("grossMargin.simulator.inputs.marginNeedsCost")}</span>
              ))}
            {estimateBadge(f.key, text, base)}
            {showPackToggle && (
              <FieldToggle
                value={isWholePack ? "pack" : "unit"}
                options={[
                  { value: "unit", label: t("grossMargin.simulator.inputs.perUnit") },
                  { value: "pack", label: t("grossMargin.simulator.inputs.perPack", { packQty }) },
                ]}
                onChange={(next) => {
                  if ((next === "pack") !== isWholePack) toggleWholePack(f);
                }}
                ariaLabel={t("grossMargin.simulator.inputs.entryBasisAria", { label: f.label })}
              />
            )}
            {text !== "" && (
              <button
                type="button"
                onClick={() => resetField(f.key)}
                className="text-muted-foreground hover:text-foreground"
                title={t("grossMargin.simulator.inputs.resetToBaseline")}
              >
                <RotateCcw className="size-3" />
              </button>
            )}
          </div>
        }
      >
        <div className="relative">
          <Input
            {...decimalInputProps}
            value={text}
            onChange={(e) => setField(f.key, e.target.value, f)}
            placeholder={formatByFieldFormat(f.format, displayBase)}
            aria-invalid={!!err}
            className={cn("pr-6", HIDE_NATIVE_SPINNER)}
          />
          <Stepper labelPrefix={f.label} onStep={(direction) => stepValue(f, base, direction)} />
        </div>
      </Field>
    );
  }

  const priceEstimate = estimates?.avgUnitPrice ?? null;
  const priceHint =
    priceEstimate && priceEstimate.source === "estimated" && priceEstimate.value !== null && overrides.avgUnitPriceBaseOverride === undefined ? (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t("grossMargin.simulator.estimates.priceHint", { price: formatCurrency(priceEstimate.value), n: priceEstimate.sampleSize })}
        </span>
        <button
          type="button"
          onClick={() => {
            const field = priceFields.find((pf) => pf.key === PRICE_KEY);
            if (field && priceEstimate.value !== null) setField(PRICE_KEY, String(roundToStep(priceEstimate.value, field.step)), field);
          }}
          className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary hover:bg-primary/20"
        >
          {t("grossMargin.simulator.estimates.usePrice")}
        </button>
      </div>
    ) : null;
  const estimatesNote = hasEstimatedFields(estimates) ? ` ${t("grossMargin.simulator.estimates.panelNote")}` : "";

  if (mode === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("grossMargin.simulator.inputs.noCostTitle")}</CardTitle>
          <CardDescription>{t("grossMargin.simulator.inputs.noCostDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{priceFields.map(fieldRow)}</div>
          {priceHint}
          {onModeSelect && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("grossMargin.simulator.inputs.sourcingQuestion")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onModeSelect("A")}
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{t("grossMargin.simulator.modes.A.plain")}</span>
                  <span className="block text-xs text-muted-foreground">{t("grossMargin.simulator.modes.A.description")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeSelect("B")}
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{t("grossMargin.simulator.modes.B.plain")}</span>
                  <span className="block text-xs text-muted-foreground">{t("grossMargin.simulator.modes.B.description")}</span>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t("grossMargin.simulator.inputs.title")}</CardTitle>
            <CardDescription>
              {t("grossMargin.simulator.inputs.description")}
              {estimatesNote}
            </CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {t("grossMargin.simulator.inputs.resetAll")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <DollarSign className="size-3.5 text-success" aria-hidden="true" />
            {t("grossMargin.simulator.inputs.salesPrice")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{priceFields.map(fieldRow)}</div>
          {priceHint}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <ShoppingCart className="size-3.5 text-[var(--chart-2)]" aria-hidden="true" />
              {t("grossMargin.simulator.inputs.purchaseCost")}
            </p>
            <div className="flex items-center gap-2">
            {sourcingSwitchable && onModeSelect && (mode === "A" || mode === "B") && (
              <FieldToggle
                value={mode}
                options={[
                  { value: "A", label: t("grossMargin.simulator.modes.A.plain") },
                  { value: "B", label: t("grossMargin.simulator.modes.B.plain") },
                ]}
                onChange={(next) => {
                  if (next !== mode) onModeSelect(next);
                }}
                ariaLabel={t("grossMargin.simulator.inputs.sourcingAria")}
              />
            )}
            {canNegotiatePallet && (
              <FieldToggle
                value={transportMode}
                options={[
                  { value: "direct", label: t("grossMargin.simulator.inputs.transportDirect") },
                  { value: "pallet", label: t("grossMargin.simulator.inputs.transportPallet") },
                ]}
                onChange={onTransportModeChange}
                ariaLabel={t("grossMargin.simulator.inputs.transportAria")}
              />
            )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {costFields.map(fieldRow)}
            {transportMode === "pallet" && transportCost && (
              <Field
                key="palletCostOverride"
                label={L("palletCost")}
                error={errors.palletCostOverride}
                labelEnd={
                  displayValue("palletCostOverride") !== "" ? (
                    <button
                      type="button"
                      onClick={() => resetField("palletCostOverride")}
                      className="text-muted-foreground hover:text-foreground"
                      title={t("grossMargin.simulator.inputs.resetToBaseline")}
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  ) : null
                }
              >
                <div className="relative">
                  <Input
                    {...decimalInputProps}
                    value={displayValue("palletCostOverride")}
                    onChange={(e) => setField("palletCostOverride", e.target.value)}
                    placeholder={formatCurrency(transportCost.PalletCost)}
                    aria-invalid={!!errors.palletCostOverride}
                    className={cn("pr-6", HIDE_NATIVE_SPINNER)}
                  />
                  <Stepper
                    labelPrefix={L("palletCost")}
                    onStep={(direction) =>
                      stepValue(
                        { key: "palletCostOverride", label: L("palletCost"), labelKey: "palletCost", group: "cost", format: "currency", step: "0.01" },
                        transportCost.PalletCost,
                        direction
                      )
                    }
                  />
                </div>
              </Field>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
