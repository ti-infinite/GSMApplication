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
import { decimalInputProps, hasAnyValue, validateRequiredText, type NumberRule } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

const WAREHOUSE_FIELDS = ["mia", "bos", "chi", "vin"] as const;
type WarehouseKey = (typeof WAREHOUSE_FIELDS)[number];
type NumKey = WarehouseKey | "measureUnit";

const SPECS: Record<NumKey, NumberRule[]> = {
  measureUnit: getFieldRules("extra-cost", "measureUnit"),
  mia: getFieldRules("extra-cost", "mia"),
  bos: getFieldRules("extra-cost", "bos"),
  chi: getFieldRules("extra-cost", "chi"),
  vin: getFieldRules("extra-cost", "vin"),
};
const EMPTY_WAREHOUSES: Record<WarehouseKey, string> = { mia: "", bos: "", chi: "", vin: "" };

// Supplier has no live data source to validate against, so it stays free
// text; the SKU and package size come from real sales rows.
export function ExtraCostCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { t } = useTranslation();
  const [supplier, setSupplier] = useState("");
  const { values: skus } = useReferenceSearch(rows, (r) => r.CalculatedSKU);
  const [selectedSku, setSelectedSku] = useState("");
  const [measureUnitText, setMeasureUnitText] = useState("");
  const [warehouseTexts, setWarehouseTexts] = useState<Record<WarehouseKey, string>>(EMPTY_WAREHOUSES);
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const texts = useMemo(
    () => ({ measureUnit: measureUnitText, ...warehouseTexts }),
    [measureUnitText, warehouseTexts]
  );
  const anyWarehouseTyped = WAREHOUSE_FIELDS.some((k) => warehouseTexts[k].trim() !== "");
  const extraErrors = useMemo(
    () => ({
      supplier: validateRequiredText(supplier),
      sku: selectedSku ? null : { code: "required" as const },
      warehouses: anyWarehouseTyped ? null : { code: "atLeastOneValue" as const },
    }),
    [supplier, selectedSku, anyWarehouseTyped]
  );
  const validation = useFieldValidation(texts, SPECS, extraErrors);

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    if (!hasAnyValue(validation.values, WAREHOUSE_FIELDS)) return;

    const body: Record<string, unknown> = {
      supplier: supplier.trim(),
      skuCalculated: selectedSku,
      measureUnit: validation.values.measureUnit,
    };
    for (const key of WAREHOUSE_FIELDS) {
      const value = validation.values[key];
      if (value !== null) body[key] = value;
    }

    await submit(
      () =>
        relayFetch("/extra-cost", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      {
        conflictMessage: t("grossMargin.updates.extraCost.conflict"),
        defaultErrorMessage: t("grossMargin.updates.extraCost.failed"),
        onSuccess: () => {
          toast.success(t("grossMargin.updates.extraCost.success", { supplier: supplier.trim(), sku: selectedSku }));
          setSupplier("");
          setSelectedSku("");
          setMeasureUnitText("");
          setWarehouseTexts(EMPTY_WAREHOUSES);
          validation.reset();
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.extraCost.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.extraCost.description")}</CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="extra-cost" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("grossMargin.common.fields.supplier")} error={validation.visibleErrors.supplier}>
            <Input
              placeholder="e.g. AGROAROMAS"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              onBlur={() => validation.touch("supplier")}
              aria-invalid={!!validation.visibleErrors.supplier}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.sku")} error={validation.visibleErrors.sku}>
            <Combobox
              value={selectedSku}
              onChange={setSelectedSku}
              options={skus.map((s) => ({ value: s, label: s }))}
              placeholder={t("grossMargin.updates.extraCost.selectSku")}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.packageSize")} error={validation.visibleErrors.measureUnit}>
            <Input
              {...decimalInputProps}
              placeholder="e.g. 16"
              value={measureUnitText}
              onChange={(e) => setMeasureUnitText(e.target.value)}
              onBlur={() => validation.touch("measureUnit")}
              aria-invalid={!!validation.visibleErrors.measureUnit}
            />
          </Field>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WAREHOUSE_FIELDS.map((key) => (
              <Field key={key} label={key.toUpperCase()} error={validation.visibleErrors[key]}>
                <Input
                  {...decimalInputProps}
                  placeholder="—"
                  value={warehouseTexts[key]}
                  onChange={(e) => setWarehouseTexts((t) => ({ ...t, [key]: e.target.value }))}
                  onBlur={() => validation.touch(key)}
                  aria-invalid={!!validation.visibleErrors[key]}
                />
              </Field>
            ))}
          </div>
          {validation.visibleErrors.warehouses && (
            <p role="alert" className="text-xs text-destructive">
              {validation.visibleErrors.warehouses}
            </p>
          )}
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.adding") : t("grossMargin.updates.extraCost.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
