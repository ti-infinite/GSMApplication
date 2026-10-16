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
import { decimalInputProps, validateDistinct } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

const SPECS = {
  quantity: getFieldRules("variety-desegregation", "quantity"),
  factor: getFieldRules("variety-desegregation", "factor"),
};

export function VarietyDesegregationCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  // Both dropdowns source from the same live Variety set -- a "child" is
  // just as much a real Variety as a "parent" is, no separate data source.
  const { t } = useTranslation();
  const { values: varieties } = useReferenceSearch(rows, (r) => r.Variety);
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedChild, setSelectedChild] = useState("");
  const [quantityText, setQuantityText] = useState("");
  // Pre-filled "1" -- the common case; only a percentage-based blend needs it
  // changed (e.g. 0.333333 for an equal 3-way split). Blank also means 1.
  const [factorText, setFactorText] = useState("1");
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const texts = useMemo(() => ({ quantity: quantityText, factor: factorText }), [quantityText, factorText]);
  const extraErrors = useMemo(
    () => ({
      parent: selectedParent ? null : { code: "required" as const },
      child: selectedChild
        ? validateDistinct(selectedChild, selectedParent, t("grossMargin.updates.mixedHerbs.theBlend"))
        : { code: "required" as const },
    }),
    [selectedParent, selectedChild, t]
  );
  const validation = useFieldValidation(texts, SPECS, extraErrors);

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    const quantity = validation.values.quantity as number;
    const factor = validation.values.factor ?? 1;

    await submit(
      () =>
        relayFetch("/variety-desegregation", {
          method: "POST",
          body: JSON.stringify({ parentVariety: selectedParent, childVariety: selectedChild, quantity, factor }),
        }),
      {
        conflictMessage: t("grossMargin.updates.mixedHerbs.conflict"),
        defaultErrorMessage: t("grossMargin.updates.mixedHerbs.failed"),
        onSuccess: () => {
          toast.success(t("grossMargin.updates.mixedHerbs.success", { child: selectedChild, parent: selectedParent }));
          setSelectedParent("");
          setSelectedChild("");
          setQuantityText("");
          setFactorText("1");
          validation.reset();
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.mixedHerbs.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.mixedHerbs.description")}</CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="variety-desegregation" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("grossMargin.updates.mixedHerbs.blend")} error={validation.visibleErrors.parent}>
            <Combobox
              value={selectedParent}
              onChange={setSelectedParent}
              options={varieties.map((v) => ({ value: v, label: v }))}
              placeholder={t("grossMargin.updates.mixedHerbs.selectBlend")}
            />
          </Field>
          <Field label={t("grossMargin.updates.mixedHerbs.component")} error={validation.visibleErrors.child}>
            <Combobox
              value={selectedChild}
              onChange={setSelectedChild}
              options={varieties.map((v) => ({ value: v, label: v }))}
              placeholder={t("grossMargin.updates.mixedHerbs.selectComponent")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("grossMargin.common.fields.quantity")} error={validation.visibleErrors.quantity}>
            <Input
              {...decimalInputProps}
              placeholder="e.g. 12"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              onBlur={() => validation.touch("quantity")}
              aria-invalid={!!validation.visibleErrors.quantity}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.factor")} error={validation.visibleErrors.factor}>
            <Input
              {...decimalInputProps}
              placeholder="1"
              value={factorText}
              onChange={(e) => setFactorText(e.target.value)}
              onBlur={() => validation.touch("factor")}
              aria-invalid={!!validation.visibleErrors.factor}
            />
          </Field>
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.adding") : t("grossMargin.updates.mixedHerbs.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
