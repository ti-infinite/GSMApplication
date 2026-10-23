import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Field } from "@/shared/ui/field";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useReferenceSearch } from "@/shared/lib/useReferenceSearch";
import { useSubmitWithConflict } from "@/shared/lib/useSubmitWithConflict";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import { decimalInputProps } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

const SPECS = { yieldValue: getFieldRules("yields", "yieldValue") };

// Yields is keyed by product code, but a human picks a Variety instead -- the
// relay derives the real code server-side, so nobody ever has to type a SKU.
export function YieldsCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { t } = useTranslation();
  const { values: varieties } = useReferenceSearch(rows, (r) => r.Variety);
  const [selectedVariety, setSelectedVariety] = useState("");
  const [yieldText, setYieldText] = useState("");
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const texts = useMemo(() => ({ yieldValue: yieldText }), [yieldText]);
  const extraErrors = useMemo(
    () => ({ variety: selectedVariety ? null : { code: "required" as const } }),
    [selectedVariety]
  );
  const validation = useFieldValidation(texts, SPECS, extraErrors);

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    const yieldValue = validation.values.yieldValue as number;

    await submit(
      () =>
        relayFetch("/yields", {
          method: "POST",
          body: JSON.stringify({ variety: selectedVariety, yieldValue }),
        }),
      {
        conflictMessage: t("grossMargin.updates.yields.conflict"),
        defaultErrorMessage: t("grossMargin.updates.yields.failed"),
        onSuccess: (json) => {
          toast.success(t("grossMargin.updates.yields.success", { variety: selectedVariety, sku: String(json.calculatedSKU) }));
          setSelectedVariety("");
          setYieldText("");
          validation.reset();
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.yields.title")}</CardTitle>
        <CardAction>
          <ReferenceBulkUpload resourceId="yields" onApplied={onApplied} />
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
          <Field label={t("grossMargin.common.fields.yield")} error={validation.visibleErrors.yieldValue}>
            <Input
              {...decimalInputProps}
              placeholder="e.g. 12"
              value={yieldText}
              onChange={(e) => setYieldText(e.target.value)}
              onBlur={() => validation.touch("yieldValue")}
              aria-invalid={!!validation.visibleErrors.yieldValue}
            />
          </Field>
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.adding") : t("grossMargin.updates.yields.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
