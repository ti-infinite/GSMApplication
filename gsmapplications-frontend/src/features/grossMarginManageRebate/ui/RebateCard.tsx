import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Field } from "@/shared/ui/field";
import { formatCurrency } from "@/shared/lib/format";
import { decimalInputProps } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
import { putRebate } from "../api/putRebate";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

const SPECS = { rebate: getFieldRules("rebate", "rebateValue") };

// Rebate doesn't fit the Add/Edit/Delete shape -- every customer already has
// an implicit $0.00 rebate, so this is a "pick a customer, set a value" upsert.
export function RebateCard({
  rows,
  rebates,
  onApplied,
}: {
  rows: SalesRow[];
  rebates: RebateRow[];
  onApplied: () => void;
}) {
  const { t } = useTranslation();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [valueText, setValueText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);

  const currentRebate = useMemo(
    () => rebates.find((r) => r.Customer === selectedCustomer)?.Rebate ?? null,
    [rebates, selectedCustomer]
  );

  const texts = useMemo(() => ({ rebate: valueText }), [valueText]);
  const extraErrors = useMemo(
    () => ({ customer: selectedCustomer ? null : { code: "required" as const } }),
    [selectedCustomer]
  );
  const validation = useFieldValidation(texts, SPECS, extraErrors);

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    const rebateValue = validation.values.rebate as number;
    setIsSubmitting(true);
    try {
      await putRebate(selectedCustomer, rebateValue);
      toast.success(t("grossMargin.updates.rebate.success", { amount: formatCurrency(rebateValue), customer: selectedCustomer }));
      setValueText("");
      validation.reset();
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.updates.rebate.failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.rebate.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.rebate.description")}</CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="rebate" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("grossMargin.common.fields.customer")} error={validation.visibleErrors.customer}>
            <Combobox
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              options={customers.map((c) => ({ value: c, label: c }))}
              placeholder={t("grossMargin.common.selectCustomer")}
            />
          </Field>
          <Field
            label={
              selectedCustomer
                ? t("grossMargin.updates.rebate.newRebateNow", { value: formatCurrency(currentRebate) })
                : t("grossMargin.updates.rebate.newRebate")
            }
            error={validation.visibleErrors.rebate}
          >
            <Input
              {...decimalInputProps}
              placeholder="e.g. 0.10"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              onBlur={() => validation.touch("rebate")}
              aria-invalid={!!validation.visibleErrors.rebate}
            />
          </Field>
        </div>

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.applying") : t("grossMargin.updates.rebate.apply")}
        </Button>
      </CardContent>
    </Card>
  );
}
