import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PackagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Skeleton } from "@/shared/ui/skeleton";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { SkuParamFields, useSkuBuilder, useSkuCatalog, type UseSkuBuilderResult } from "@/entities/product";
import { cn } from "@/shared/lib/utils";
import { Field, FieldToggle } from "@/shared/ui/field";
import { decimalInputProps, parseDecimal } from "@/shared/lib/formValidation";

const FIELD_LABEL_CLASS = "text-xs font-medium text-muted-foreground";


export interface NewVarietyShape {
  measurementUnitValue: number;
  packQty: number | null;
  /** How the product is bought: 1 = packed by the supplier (unit), 0 = by the pound. Required for a new product. */
  flag?: 0 | 1 | null;
  /** Real product code built from the SKU catalog; null when the catalog wasn't available. */
  calculatedSku?: string | null;
}


interface SkuParts {
  classAttr: { shortName: string; code: string; descr: string } | null;
  typeAttr: { shortName: string; code: string; descr: string } | null;
  productAttr: { shortName: string; code: string; descr: string } | null;
  packingAttr: { shortName: string; code: string; descr: string } | null;
}

function pickSkuParts(sku: UseSkuBuilderResult): SkuParts {
  const parts: SkuParts = { classAttr: null, typeAttr: null, productAttr: null, packingAttr: null };
  for (const rule of sku.rules) {
    const attr = sku.selectedParams[rule.IdParameter];
    if (!attr) continue;
    const name = rule.RuleName.toUpperCase();
    if (name.includes("CLASS")) parts.classAttr = attr;
    else if (name.includes("TYPE")) parts.typeAttr = attr;
    else if (name.includes("PACK")) parts.packingAttr = attr;
    else if (!parts.productAttr) parts.productAttr = attr;
  }
  return parts;
}


function salesCalculatedSku(sku: UseSkuBuilderResult): string | null {
  const { classAttr, typeAttr, productAttr, packingAttr } = pickSkuParts(sku);
  if (classAttr && typeAttr && productAttr) return `${classAttr.code}${typeAttr.code}${productAttr.code}`.toUpperCase();
  if (!sku.allParamsSelected || !sku.effectiveCategory) return null;
  // Template without recognisable rule names: strip what we can identify.
  let code = sku.skuPrefix.toUpperCase();
  const category = sku.effectiveCategory.AggregatedCode.toUpperCase();
  if (category && code.startsWith(category)) code = code.slice(category.length);
  const packing = packingAttr?.code.toUpperCase();
  if (packing && code.endsWith(packing)) code = code.slice(0, -packing.length);
  return code || null;
}


function QuoteSkuCodeChips({ sku, t }: { sku: UseSkuBuilderResult; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const { classAttr, typeAttr, productAttr, packingAttr } = pickSkuParts(sku);
  const parts = [classAttr, typeAttr, productAttr];
  const code = salesCalculatedSku(sku);
  const chip = "rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary";
  return (
    <>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t("grossMargin.simulator.sku.salesCode")}
      </p>
      {parts.some(Boolean) ? (
        <div className="flex flex-wrap items-center gap-2">
          {parts.map((attr, i) =>
            attr ? (
              <span key={i} className={chip}>
                {attr.code.toUpperCase()}
              </span>
            ) : null
          )}
          {parts.some((attr) => !attr) && <span className="text-xs text-muted-foreground">...</span>}
          <span className="ml-2 text-base font-bold tracking-wider text-foreground">{code ?? "-"}</span>
          {packingAttr && (
            <span className="ml-auto rounded bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
              {t("grossMargin.simulator.sku.packingChip", { code: packingAttr.code.toUpperCase() })}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("grossMargin.simulator.sku.empty")}</p>
      )}
      <p className="mt-2 text-[0.65rem] text-muted-foreground">{t("grossMargin.simulator.sku.salesCodeHint")}</p>
    </>
  );
}


const PACKING_WORDS: Record<string, string> = {
  CLA: "CLAMSHELL",
  CLAM: "CLAMSHELL",
  BAG: "BAG",
  BOX: "BOX",
  TUB: "TUB",
  BUN: "BUNCH",
  BUNCH: "BUNCH",
  POT: "POTTED HERBS",
};

function packingWord(attr: SkuParts["packingAttr"], typeAttr: SkuParts["typeAttr"]): string {
  if (typeAttr && typeAttr.shortName.toUpperCase().includes("POTTED")) return "POTTED HERBS";
  if (!attr) return "";
  const byCode = PACKING_WORDS[attr.code.toUpperCase()] ?? PACKING_WORDS[attr.shortName.toUpperCase()];
  if (byCode) return byCode;
  const descr = attr.descr?.trim();
  return (descr && descr.length >= attr.shortName.length ? descr : attr.shortName).toUpperCase();
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}


function suggestVarietyName(sku: UseSkuBuilderResult, measurementUnitValueText: string, packQtyText: string): string {
  const { classAttr, typeAttr, productAttr, packingAttr } = pickSkuParts(sku);
  if (!productAttr) return "";
  const herb = productAttr.shortName.toUpperCase();

  const unit = parseDecimal(measurementUnitValueText);
  let size = "";
  if (typeof unit === "number" && unit > 0) {
    size = unit >= 16 && Number.isInteger(unit / 16) ? `${unit / 16} LB` : `${unit} OZ`;
  }

  const pack = parseDecimal(packQtyText);
  const packPart = typeof pack === "number" && pack > 1 ? `${pack} PK` : "";

  const presentation = [packingWord(packingAttr, typeAttr), size, packPart].filter(Boolean).join(" ");
  const classWord = classAttr ? titleCase(classAttr.shortName) : "";
  return [presentation ? `${herb} - ${presentation}` : herb, classWord].filter(Boolean).join(" ");
}

type ProductMode = "existing" | "new";

export function QuoteSimulatorNewCustomerProductPicker({
  rows,
  onCreate,
}: {
  rows: SalesRow[];
  onCreate: (
    variety: string,
    warehouse: string,
    customerName: string,
    isExistingCustomer: boolean,
    shape: NewVarietyShape | null
  ) => void;
}) {
  const { t } = useTranslation();
  const [productMode, setProductMode] = useState<ProductMode>("existing");

  const [selectedVariety, setSelectedVariety] = useState("");


  const [variety, setVariety] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [measurementUnitValueText, setMeasurementUnitValueText] = useState("");
  const [packQtyText, setPackQtyText] = useState("");

  const [sourcing, setSourcing] = useState<0 | 1 | null>(null);
  const { catalog, isLoading: isCatalogLoading, isError: isCatalogError } = useSkuCatalog();
  const sku = useSkuBuilder(catalog.categories, catalog.skuTemplates, catalog.skuParameters, catalog.masterProducts);
  const skuReady = isCatalogError || sku.allParamsSelected;

  useEffect(() => {
    if (productMode !== "new" || nameTouched || isCatalogError) return;
    const suggested = suggestVarietyName(sku, measurementUnitValueText, packQtyText);
    if (suggested) setVariety(suggested);
  }, [productMode, nameTouched, isCatalogError, sku, measurementUnitValueText, packQtyText]);

  const [warehouse, setWarehouse] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [existingCustomer, setExistingCustomer] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  const varieties = useMemo(() => Array.from(new Set(rows.map((r) => r.Variety))).sort(), [rows]);
  const knownCustomers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);
  const existingVarietyNames = useMemo(() => new Set(rows.map((r) => r.Variety.toLowerCase())), [rows]);
  const allWarehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);

  const warehousesForVariety = useMemo(
    () =>
      productMode === "existing"
        ? Array.from(new Set(rows.filter((r) => r.Variety === selectedVariety).map((r) => r.Warehouse))).sort()
        : [],
    [rows, productMode, selectedVariety]
  );
  const otherWarehouses = useMemo(
    () => allWarehouses.filter((w) => !warehousesForVariety.includes(w)),
    [allWarehouses, warehousesForVariety]
  );

  function handleProductModeChange(mode: ProductMode) {
    setProductMode(mode);
    setWarehouse("");
    if (mode === "existing") {
      setVariety("");
      setNameTouched(false);
      setSourcing(null);
      sku.reset();
    } else {
      setSelectedVariety("");
    }
  }

  function handleExistingVariety(v: string) {
    setSelectedVariety(v);
    const warehouses = Array.from(new Set(rows.filter((r) => r.Variety === v).map((r) => r.Warehouse)));
    setWarehouse(warehouses.length === 1 ? warehouses[0] : "");
  }

  const effectiveVariety = productMode === "existing" ? selectedVariety : variety.trim();
  const alreadyExists = productMode === "new" && effectiveVariety.length > 0 && existingVarietyNames.has(effectiveVariety.toLowerCase());

  const parsedUnit = parseDecimal(measurementUnitValueText);
  const measurementUnitValue = typeof parsedUnit === "number" ? parsedUnit : NaN;
  const shapeValid = typeof parsedUnit === "number" && parsedUnit > 0;
  const parsedPackQty = parseDecimal(packQtyText);
  const packQtyValid = parsedPackQty === null || (typeof parsedPackQty === "number" && parsedPackQty > 0 && Number.isInteger(parsedPackQty));

  const customerName = customerMode === "existing" ? existingCustomer : newCustomerName.trim();
  const canCreate =
    productMode === "existing"
      ? !!selectedVariety && !!warehouse && customerName.length > 0
      : effectiveVariety.length > 0 &&
        !alreadyExists &&
        !!warehouse &&
        shapeValid &&
        packQtyValid &&
        skuReady &&
        sourcing !== null &&
        customerName.length > 0;

  function handleCreate() {
    const shape: NewVarietyShape | null =
      productMode === "existing"
        ? null
        : {
            measurementUnitValue,
            packQty: typeof parsedPackQty === "number" ? parsedPackQty : null,
            calculatedSku: sku.allParamsSelected ? salesCalculatedSku(sku) : null,
            flag: sourcing,
          };
    onCreate(effectiveVariety, warehouse, customerName, customerMode === "existing", shape);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PackagePlus className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t("grossMargin.simulator.newCustomerProduct.title")}</CardTitle>
            <CardDescription>{t("grossMargin.simulator.newCustomerProduct.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          label={t("grossMargin.simulator.newCustomerProduct.product")}
          step={{ n: 1, active: effectiveVariety.length > 0 && !alreadyExists }}
          labelEnd={
            <FieldToggle
              value={productMode}
              options={[
                { value: "existing", label: t("grossMargin.simulator.newCustomerProduct.productExisting") },
                { value: "new", label: t("grossMargin.simulator.newCustomerProduct.productNew") },
              ]}
              onChange={handleProductModeChange}
              ariaLabel={t("grossMargin.simulator.newCustomerProduct.productTypeAria")}
            />
          }
        >
          {productMode === "existing" ? (
            <Combobox
              value={selectedVariety}
              onChange={handleExistingVariety}
              options={varieties.map((v) => ({ value: v, label: v }))}
              placeholder={t("grossMargin.common.selectVariety")}
            />
          ) : (
            <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.newCustomerProduct.buildBelow")}</p>
          )}
        </Field>

        {productMode === "new" && (
          <>
            {isCatalogError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {t("grossMargin.simulator.newVariety.catalogUnavailable")}
              </p>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold",
                      sku.allParamsSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    2
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
                      <QuoteSkuCodeChips sku={sku} t={t} />
                    </div>
                  </>
                )}
              </div>
            )}

            <Field label={t("grossMargin.simulator.inputs.sourcingQuestion")} step={{ n: 3, active: sourcing !== null }}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([1, 0] as const).map((value) => {
                  const modeKey = value === 1 ? "A" : "B";
                  const selected = sourcing === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSourcing(value)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        selected ? "border-primary bg-primary/10" : "border-input"
                      )}
                    >
                      <span className="font-medium">{t(`grossMargin.simulator.modes.${modeKey}.plain`)}</span>
                      <span className="block text-xs text-muted-foreground">{t(`grossMargin.simulator.modes.${modeKey}.description`)}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

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
              <Field
                label={t("grossMargin.simulator.newVariety.packQty")}
                error={packQtyValid ? null : t("grossMargin.simulator.newVariety.packQtyError")}
              >
                <Input
                  {...decimalInputProps}
                  placeholder="e.g. 3"
                  value={packQtyText}
                  onChange={(e) => setPackQtyText(e.target.value)}
                  aria-invalid={!packQtyValid}
                />
              </Field>
            </div>

            <Field
              label={t("grossMargin.simulator.newVariety.varietyName")}
              step={{ n: 5, active: effectiveVariety.length > 0 && !alreadyExists }}
              error={alreadyExists ? t("grossMargin.simulator.newVariety.alreadyExists") : null}
              labelEnd={
                !nameTouched && variety.length > 0 ? (
                  <span className="text-xs text-muted-foreground">{t("grossMargin.simulator.newVariety.nameSuggested")}</span>
                ) : null
              }
            >
              <Input
                placeholder="e.g. TARRAGON - CLAMSHELL 0.5 OZ 3 PK Conventional"
                value={variety}
                onChange={(e) => {
                  setNameTouched(true);
                  setVariety(e.target.value);
                }}
                aria-invalid={alreadyExists}
              />
            </Field>
          </>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("grossMargin.common.fields.warehouse")} step={{ n: productMode === "existing" ? 2 : 6, active: !!warehouse }}>
            {productMode === "existing" ? (
              <Select value={warehouse} onValueChange={(v) => v && setWarehouse(v)} disabled={!selectedVariety}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={selectedVariety ? t("grossMargin.common.selectWarehouse") : t("grossMargin.simulator.picker.varietyFirst")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {warehousesForVariety.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t("grossMargin.simulator.newCustomer.shipsFrom")}</SelectLabel>
                      {warehousesForVariety.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {warehousesForVariety.length > 0 && otherWarehouses.length > 0 && <SelectSeparator />}
                  {otherWarehouses.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t("grossMargin.simulator.newCustomer.noDataYet")}</SelectLabel>
                      {otherWarehouses.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Combobox
                value={warehouse}
                onChange={setWarehouse}
                options={allWarehouses.map((w) => ({ value: w, label: w }))}
                placeholder={t("grossMargin.common.selectWarehouse")}
              />
            )}
          </Field>
          <Field
            label={t("grossMargin.common.fields.customer")}
            step={{ n: productMode === "existing" ? 3 : 7, active: customerName.length > 0 }}
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
              <Input placeholder="e.g. ACME GROCERY" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
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
