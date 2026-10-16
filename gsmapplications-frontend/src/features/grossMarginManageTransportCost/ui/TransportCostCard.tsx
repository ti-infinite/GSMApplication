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
import { decimalInputProps, type NumberRule } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

const TYPE_OPTIONS = ["R", "P"];
const PACKAGING_OPTIONS = ["CLA", "BAG", "BOX"];
// Sentinel for the Select control only -- never sent to the relay. An unset
// Warehouse means "applies regardless of warehouse".
const ANY_WAREHOUSE = "__any__";

type NumKey = "measurementUnitValue" | "packQty" | "qty" | "boxesXPallet" | "palletCost";
const SPECS: Record<NumKey, NumberRule[]> = {
  measurementUnitValue: getFieldRules("transport-cost", "measurementUnitValue"),
  packQty: getFieldRules("transport-cost", "packQty"),
  qty: getFieldRules("transport-cost", "qty"),
  boxesXPallet: getFieldRules("transport-cost", "boxesXPallet"),
  palletCost: getFieldRules("transport-cost", "palletCost"),
};
const EMPTY_TEXTS: Record<NumKey, string> = {
  measurementUnitValue: "",
  packQty: "",
  qty: "",
  boxesXPallet: "",
  palletCost: "",
};

export function TransportCostCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { t } = useTranslation();
  const { values: divisions } = useReferenceSearch(rows, (r) => r.Customer);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [warehouse, setWarehouse] = useState(ANY_WAREHOUSE);
  const [type, setType] = useState("");
  const [packaging, setPackaging] = useState("");
  const [texts, setTexts] = useState<Record<NumKey, string>>(EMPTY_TEXTS);
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const warehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);

  const extraErrors = useMemo(
    () => ({
      division: selectedDivision ? null : { code: "required" as const },
      type: type ? null : { code: "required" as const },
      packaging: packaging ? null : { code: "required" as const },
    }),
    [selectedDivision, type, packaging]
  );
  const validation = useFieldValidation(texts, SPECS, extraErrors);

  function setText(key: NumKey, value: string) {
    setTexts((t) => ({ ...t, [key]: value }));
  }

  async function handleApply() {
    if (!validation.attemptSubmit()) return;
    const v = validation.values;

    const body: Record<string, unknown> = {
      divisionName: selectedDivision,
      measurementUnitValue: v.measurementUnitValue,
      type,
      packaging,
      qty: v.qty,
      boxesXPallet: v.boxesXPallet ?? undefined,
      palletCost: v.palletCost ?? undefined,
      warehouse: warehouse === ANY_WAREHOUSE ? undefined : warehouse,
      packQty: v.packQty ?? undefined,
    };

    await submit(
      () =>
        relayFetch("/transport-cost", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      {
        conflictMessage: t("grossMargin.updates.transportCost.conflict"),
        defaultErrorMessage: t("grossMargin.updates.transportCost.failed"),
        onSuccess: () => {
          toast.success(t("grossMargin.updates.transportCost.success", { customer: selectedDivision }));
          setSelectedDivision("");
          setWarehouse(ANY_WAREHOUSE);
          setType("");
          setPackaging("");
          setTexts(EMPTY_TEXTS);
          validation.reset();
          onApplied();
        },
      }
    );
  }

  function numberField(key: NumKey, label: string, placeholder: string) {
    return (
      <Field label={label} error={validation.visibleErrors[key]}>
        <Input
          {...decimalInputProps}
          placeholder={placeholder}
          value={texts[key]}
          onChange={(e) => setText(key, e.target.value)}
          onBlur={() => validation.touch(key)}
          aria-invalid={!!validation.visibleErrors[key]}
        />
      </Field>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.transportCost.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.transportCost.description")}</CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="transport-cost" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("grossMargin.common.fields.customer")} error={validation.visibleErrors.division}>
            <Combobox
              value={selectedDivision}
              onChange={setSelectedDivision}
              options={divisions.map((d) => ({ value: d, label: d }))}
              placeholder={t("grossMargin.common.selectCustomer")}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.warehouse")}>
            <Combobox
              value={warehouse}
              onChange={(v) => setWarehouse(v || ANY_WAREHOUSE)}
              options={[
                { value: ANY_WAREHOUSE, label: t("grossMargin.common.anyWarehouse") },
                ...warehouses.map((w) => ({ value: w, label: w })),
              ]}
              placeholder={t("grossMargin.common.anyWarehouse")}
            />
          </Field>
          {numberField("measurementUnitValue", t("grossMargin.common.fields.packageSize"), "e.g. 1")}
          {numberField("packQty", t("grossMargin.common.fields.packSize"), t("grossMargin.updates.transportCost.anyPackSize"))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label={t("grossMargin.common.fields.type")} error={validation.visibleErrors.type}>
            <Combobox
              value={type}
              onChange={setType}
              options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
              placeholder="—"
            />
          </Field>
          <Field label={t("grossMargin.common.fields.packaging")} error={validation.visibleErrors.packaging}>
            <Combobox
              value={packaging}
              onChange={setPackaging}
              options={PACKAGING_OPTIONS.map((p) => ({ value: p, label: p }))}
              placeholder="—"
            />
          </Field>
          {numberField("qty", t("grossMargin.common.fields.qty"), "—")}
          {numberField("boxesXPallet", t("grossMargin.common.fields.boxesPerPallet"), "—")}
          {numberField("palletCost", t("grossMargin.common.fields.palletCost"), "—")}
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !validation.isValid}>
          {isSubmitting ? t("grossMargin.common.adding") : t("grossMargin.updates.transportCost.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
