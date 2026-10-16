import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PackagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Skeleton } from "@/shared/ui/skeleton";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { SkuChips, SkuParamFields, useSkuBuilder, useSkuCatalog } from "@/entities/product";
import { cn } from "@/shared/lib/utils";
import { Field, FieldToggle } from "@/shared/ui/field";
import { decimalInputProps, parseDecimal } from "@/shared/lib/formValidation";
import type { NewVarietyShape } from "./QuoteSimulatorNewCustomerPicker";


const FIELD_LABEL_CLASS = "text-xs font-medium text-muted-foreground";

// The one place a genuinely brand-new product gets quoted -- no existing
// data to fall back on for ANY field, including the customer (which can
// still be an existing one), so every field starts from nothing.
export function QuoteSimulatorNewVarietyPicker({
  rows,
  onCreate,
}: {
  rows: SalesRow[];
  onCreate: (
    variety: string,
    warehouse: string,
    customerName: string,
    isExistingCustomer: boolean,
    shape: NewVarietyShape
  ) => void;
}) {
  const { t } = useTranslation();
  const [variety, setVariety] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [measurementUnitValueText, setMeasurementUnitValueText] = useState("");
  const [packQtyText, setPackQtyText] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [existingCustomer, setExistingCustomer] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  // The same SKU catalog and builder the Products and Productivity wizards
  // use, so a product quoted here gets the code it will really carry.
  const { catalog, isLoading: isCatalogLoading, isError: isCatalogError } = useSkuCatalog();
  const sku = useSkuBuilder(catalog.categories, catalog.skuTemplates, catalog.skuParameters, catalog.masterProducts);
  // Required whenever the catalog is available; if the operations API is
  // down the quote must still be possible, just without a saved code.
  const skuReady = isCatalogError || sku.allParamsSelected;

  const allWarehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);
  const knownCustomers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);
  const existingVarietyNames = useMemo(() => new Set(rows.map((r) => r.Variety.toLowerCase())), [rows]);

  const varietyTrimmed = variety.trim();
  const alreadyExists = varietyTrimmed.length > 0 && existingVarietyNames.has(varietyTrimmed.toLowerCase());

  const parsedUnit = parseDecimal(measurementUnitValueText);
  const measurementUnitValue = typeof parsedUnit === "number" ? parsedUnit : NaN;
  const shapeValid = typeof parsedUnit === "number" && parsedUnit > 0;
  const parsedPackQty = parseDecimal(packQtyText);
  const packQtyValid = parsedPackQty === null || (typeof parsedPackQty === "number" && parsedPackQty > 0 && Number.isInteger(parsedPackQty));

  const customerName = customerMode === "existing" ? existingCustomer : newCustomerName.trim();
  const canCreate =
    varietyTrimmed.length > 0 &&
    !alreadyExists &&
    !!warehouse &&
    shapeValid &&
    packQtyValid &&
    skuReady &&
    customerName.length > 0;

  function handleCreate() {
    onCreate(varietyTrimmed, warehouse, customerName, customerMode === "existing", {
      measurementUnitValue,
      packQty: typeof parsedPackQty === "number" ? parsedPackQty : null,
      calculatedSku: sku.allParamsSelected ? sku.skuPrefix : null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PackagePlus className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t("grossMargin.simulator.newVariety.title")}</CardTitle>
            <CardDescription>{t("grossMargin.simulator.newVariety.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t("grossMargin.simulator.newVariety.varietyName")}
            step={{ n: 1, active: varietyTrimmed.length > 0 && !alreadyExists }}
            error={alreadyExists ? t("grossMargin.simulator.newVariety.alreadyExists") : null}
          >
            <Input
              placeholder="e.g. TARRAGON - CLAMSHELL 0.5 OZ 3 PK Conventional"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              aria-invalid={alreadyExists}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.warehouse")} step={{ n: 2, active: !!warehouse }}>
            <Combobox
              value={warehouse}
              onChange={setWarehouse}
              options={allWarehouses.map((w) => ({ value: w, label: w }))}
              placeholder={t("grossMargin.common.selectWarehouse")}
            />
          </Field>
        </div>

        {!isCatalogError && (
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold",
                  sku.allParamsSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                3
              </span>
              {t("grossMargin.simulator.newVariety.productCode")}
            </label>
            {isCatalogLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SkuParamFields
                    categories={catalog.categories}
                    sku={sku}
                    fieldClassName="space-y-1.5"
                    labelClassName={FIELD_LABEL_CLASS}
                    disabledLabelClassName={cn(FIELD_LABEL_CLASS, "opacity-60")}
                    labels={{
                      category: t("grossMargin.simulator.sku.category"),
                      categoryPlaceholder: t("grossMargin.simulator.sku.categoryPlaceholder"),
                      subcategory: t("grossMargin.simulator.sku.subcategory"),
                      subcategoryPlaceholder: t("grossMargin.simulator.sku.subcategoryPlaceholder"),
                      param: (name) => t("grossMargin.simulator.sku.param", { name }),
                    }}
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <SkuChips sku={sku} title={t("grossMargin.simulator.sku.title")} emptyLabel={t("grossMargin.simulator.sku.empty")} />
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t("grossMargin.simulator.newVariety.measurementUnit")}
            step={{ n: 4, active: shapeValid }}
            error={measurementUnitValueText !== "" && !shapeValid ? t("grossMargin.simulator.newVariety.unitError") : null}
          >
            <Input
              {...decimalInputProps}
              placeholder="e.g. 0.5"
              value={measurementUnitValueText}
              onChange={(e) => setMeasurementUnitValueText(e.target.value)}
              aria-invalid={measurementUnitValueText !== "" && !shapeValid}
            />
          </Field>
          <Field label={t("grossMargin.simulator.newVariety.packQty")} error={packQtyValid ? null : t("grossMargin.simulator.newVariety.packQtyError")}>
            <Input
              {...decimalInputProps}
              placeholder="e.g. 3"
              value={packQtyText}
              onChange={(e) => setPackQtyText(e.target.value)}
              aria-invalid={!packQtyValid}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t("grossMargin.common.fields.customer")}
            step={{ n: 5, active: customerName.length > 0 }}
            labelEnd={
              <FieldToggle
                value={customerMode}
                options={[
                  { value: "existing", label: t("grossMargin.simulator.newVariety.customerExisting") },
                  { value: "new", label: t("grossMargin.simulator.newVariety.customerNew") },
                ]}
                onChange={setCustomerMode}
                ariaLabel={t("grossMargin.simulator.newVariety.customerTypeAria")}
              />
            }
          >
            {customerMode === "existing" ? (
              <Combobox
                value={existingCustomer}
                onChange={setExistingCustomer}
                options={knownCustomers.map((c) => ({ value: c, label: c }))}
                placeholder={t("grossMargin.common.selectCustomer")}
              />
            ) : (
              <Input
                placeholder="e.g. ACME GROCERY"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
            )}
          </Field>
        </div>

        <Button disabled={!canCreate} onClick={handleCreate}>
          {t("grossMargin.simulator.newVariety.createQuote")}
        </Button>
      </CardContent>
    </Card>
  );
}
