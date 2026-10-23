import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Field } from "@/shared/ui/field";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useReferenceSearch } from "@/shared/lib/useReferenceSearch";
import { useSubmitWithConflict } from "@/shared/lib/useSubmitWithConflict";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import { decimalInputProps, hasAnyValue, type NumberRule } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

const FIELDS = [
  { key: "packing" },
  { key: "sticker" },
  { key: "box" },
  { key: "labourProd" },
  { key: "labourRepack" },
  { key: "labourAssembler" },
] as const;
type CostKey = (typeof FIELDS)[number]["key"];
const COST_KEYS = FIELDS.map((f) => f.key);

const SPECS = Object.fromEntries(FIELDS.map((f) => [f.key, getFieldRules("cost-reference", f.key)])) as Record<
  CostKey,
  NumberRule[]
>;
const EMPTY_TEXTS = Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<CostKey, string>;

export function CostReferenceCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { t } = useTranslation();
  const { values: varieties } = useReferenceSearch(rows, (r) => r.Variety);
  const [selectedVariety, setSelectedVariety] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [texts, setTexts] = useState<Record<CostKey, string>>(EMPTY_TEXTS);
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const warehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);

  const anyCostTyped = COST_KEYS.some((k) => texts[k].trim() !== "");
  const extraErrors = useMemo(
    () => ({
      variety: selectedVariety ? null : { code: "required" as const },
      warehouse: selectedWarehouse ? null : { code: "required" as const },
      costs: anyCostTyped ? null : { code: "atLeastOneValue" as const },
    }),
    [selectedVariety, selectedWarehouse, anyCostTyped]
  );
  const validation = useFieldValidation(texts, SPECS, extraErrors);

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    if (!hasAnyValue(validation.values, COST_KEYS)) return;
    const body: Record<string, unknown> = { variety: selectedVariety, warehouse: selectedWarehouse };
    for (const key of COST_KEYS) {
      const value = validation.values[key];
      if (value !== null) body[key] = value;
    }

    await submit(
      () =>
        relayFetch("/cost-reference", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      {
        conflictMessage: t("grossMargin.updates.costReference.conflict"),
        defaultErrorMessage: t("grossMargin.updates.costReference.failed"),
        onSuccess: (json) => {
          if (json.warning) toast.warning(json.warning as string);
          toast.success(t("grossMargin.updates.costReference.success", { variety: selectedVariety, warehouse: selectedWarehouse }));
          setSelectedVariety("");
          setSelectedWarehouse("");
          setTexts(EMPTY_TEXTS);
          validation.reset();
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.costReference.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.costReference.description")}</CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="cost-reference" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("grossMargin.common.fields.variety")} error={validation.visibleErrors.variety}>
            <Combobox
              value={selectedVariety}
              onChange={setSelectedVariety}
              options={varieties.map((v) => ({ value: v, label: v }))}
              placeholder={t("grossMargin.common.selectVariety")}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.warehouse")} error={validation.visibleErrors.warehouse}>
            <Combobox
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              options={warehouses.map((w) => ({ value: w, label: w }))}
              placeholder={t("grossMargin.common.selectWarehouse")}
            />
          </Field>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <Field key={f.key} label={t(`grossMargin.common.fields.${f.key}`)} error={validation.visibleErrors[f.key]}>
                <Input
                  {...decimalInputProps}
                  placeholder="—"
                  value={texts[f.key]}
                  onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))}
                  onBlur={() => validation.touch(f.key)}
                  aria-invalid={!!validation.visibleErrors[f.key]}
                />
              </Field>
            ))}
          </div>
          {validation.visibleErrors.costs && (
            <p role="alert" className="text-xs text-destructive">
              {validation.visibleErrors.costs}
            </p>
          )}
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.adding") : t("grossMargin.updates.costReference.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
