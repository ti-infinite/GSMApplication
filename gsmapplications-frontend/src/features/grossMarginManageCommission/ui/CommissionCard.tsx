import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Field, FieldToggle } from "@/shared/ui/field";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { decimalInputProps } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
import { upsertCommission } from "../api/upsertCommission";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

type CommissionMode = "percent" | "value";

const MODE_OPTIONS: { value: CommissionMode; label: string }[] = [
  { value: "percent", label: "%" },
  { value: "value", label: "$" },
];

// Commission applies per Customer only (never per Variety) and lives in the
// shared client attributes, same mechanism as Rebate: pick a customer, set a
// type + amount, upsert.
export function CommissionCard({
  rows,
  commissions,
  onApplied,
}: {
  rows: SalesRow[];
  commissions: CommissionRow[];
  onApplied: () => void;
}) {
  const { t } = useTranslation();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [mode, setMode] = useState<CommissionMode>("percent");
  const [amountText, setAmountText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);

  const currentCommission = useMemo(
    () => commissions.find((c) => c.Customer === selectedCustomer) ?? null,
    [commissions, selectedCustomer]
  );

  const texts = useMemo(() => ({ amount: amountText }), [amountText]);
  const specs = useMemo(
    () => ({ amount: getFieldRules("commission", mode === "percent" ? "commissionAmountPercent" : "commissionAmountValue") }),
    [mode]
  );
  const extraErrors = useMemo(
    () => ({ customer: selectedCustomer ? null : { code: "required" as const } }),
    [selectedCustomer]
  );
  const validation = useFieldValidation(texts, specs, extraErrors);

  function selectCustomer(customer: string) {
    setSelectedCustomer(customer);
    setAmountText("");
    validation.reset();
  }

  function changeMode(next: CommissionMode) {
    setMode(next);
    setAmountText("");
  }

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    const amount = validation.values.amount as number;
    setIsSubmitting(true);
    try {
      const commissionAmount = mode === "percent" ? amount / 100 : amount;
      await upsertCommission(selectedCustomer, mode, commissionAmount);
      toast.success(
        t("grossMargin.updates.commission.success", {
          amount: mode === "percent" ? formatPercent(commissionAmount) : formatCurrency(commissionAmount),
          customer: selectedCustomer,
        })
      );
      setAmountText("");
      validation.reset();
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.updates.commission.failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentLabel = currentCommission
    ? currentCommission.CommissionType === "percent"
      ? formatPercent(currentCommission.CommissionAmount)
      : formatCurrency(currentCommission.CommissionAmount)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.commission.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.commission.description")}</CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="commission" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("grossMargin.common.fields.customer")} error={validation.visibleErrors.customer}>
            <Combobox
              value={selectedCustomer}
              onChange={selectCustomer}
              options={customers.map((c) => ({ value: c, label: c }))}
              placeholder={t("grossMargin.common.selectCustomer")}
            />
          </Field>
          <Field
            label={
              selectedCustomer && currentLabel
                ? t("grossMargin.updates.commission.newCommissionNow", { value: currentLabel })
                : t("grossMargin.updates.commission.newCommission")
            }
            labelEnd={
              <FieldToggle
                value={mode}
                options={MODE_OPTIONS}
                onChange={changeMode}
                ariaLabel={t("grossMargin.updates.commission.typeAria")}
              />
            }
            error={validation.visibleErrors.amount}
          >
            <Input
              {...decimalInputProps}
              placeholder={mode === "percent" ? "e.g. 10" : "e.g. 0.15"}
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={() => validation.touch("amount")}
              aria-invalid={!!validation.visibleErrors.amount}
            />
          </Field>
        </div>

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.applying") : t("grossMargin.updates.commission.apply")}
        </Button>
      </CardContent>
    </Card>
  );
}
