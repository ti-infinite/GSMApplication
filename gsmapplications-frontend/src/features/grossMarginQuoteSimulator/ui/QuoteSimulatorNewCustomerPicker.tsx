import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
// NOTE: the Warehouse picker below still uses the legacy Select (Base UI)
// because it groups options into "Ships from already" / "No data yet"
// sections -- GSM's Combobox has no grouping concept. Flagged for manual
// review rather than guessed at; see migration report.
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
import { Field } from "@/shared/ui/field";

// Shared with quote-simulator-new-variety-picker.tsx -- both flows end up
// building a manual starting point (buildManualBaseline) from a typed
// Measurement Unit/Pack Qty shape, just reached via different tabs.
export interface NewVarietyShape {
  measurementUnitValue: number;
  packQty: number | null;
  /** Real product code built from the SKU catalog; null when the catalog wasn't available. */
  calculatedSku?: string | null;
}

// Existing-catalog varieties only -- quoting a brand-new product (never sold
// anywhere) is the "New Variety" tab's job. This tab stays focused on its
// one axis: a product we already sell, a customer who's new to us.
export function QuoteSimulatorNewCustomerPicker({
  rows,
  onCreate,
}: {
  rows: SalesRow[];
  onCreate: (variety: string, warehouse: string, customerName: string) => void;
}) {
  const { t } = useTranslation();
  const [selectedVariety, setSelectedVariety] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [customerName, setCustomerName] = useState("");

  const varieties = useMemo(() => Array.from(new Set(rows.map((r) => r.Variety))).sort(), [rows]);
  // Every known warehouse, not filtered by Variety -- lets the user pick one
  // this Variety has never shipped from (falls to buildManualBaseline).
  const allWarehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);
  // Warehouses THIS Variety actually has real data for -- shown first and
  // grouped separately so picking one with no data isn't mistaken for "no
  // data anywhere" for a well-established product.
  const warehousesForVariety = useMemo(
    () => Array.from(new Set(rows.filter((r) => r.Variety === selectedVariety).map((r) => r.Warehouse))).sort(),
    [rows, selectedVariety]
  );
  const otherWarehouses = useMemo(
    () => allWarehouses.filter((w) => !warehousesForVariety.includes(w)),
    [allWarehouses, warehousesForVariety]
  );

  function handleVariety(v: string) {
    setSelectedVariety(v);
    const warehouses = Array.from(new Set(rows.filter((r) => r.Variety === v).map((r) => r.Warehouse)));
    setSelectedWarehouse(warehouses.length === 1 ? warehouses[0] : "");
  }

  const canCreate = !!selectedVariety && !!selectedWarehouse && customerName.trim().length > 0;

  function handleCreate() {
    onCreate(selectedVariety, selectedWarehouse, customerName.trim());
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t("grossMargin.simulator.newCustomer.title")}</CardTitle>
            <CardDescription>{t("grossMargin.simulator.newCustomer.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("grossMargin.common.fields.variety")} step={{ n: 1, active: !!selectedVariety }}>
            <Combobox
              value={selectedVariety}
              onChange={handleVariety}
              options={varieties.map((v) => ({ value: v, label: v }))}
              placeholder={t("grossMargin.common.selectVariety")}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.warehouse")} step={{ n: 2, active: !!selectedWarehouse }}>
            <Select value={selectedWarehouse} onValueChange={(v) => v && setSelectedWarehouse(v)} disabled={!selectedVariety}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedVariety ? t("grossMargin.common.selectWarehouse") : t("grossMargin.simulator.picker.varietyFirst")} />
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
          </Field>
          <Field label={t("grossMargin.simulator.newCustomer.newCustomerName")} step={{ n: 3, active: customerName.trim().length > 0 }}>
            <Input
              placeholder="e.g. ACME GROCERY"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </Field>
        </div>
        <Button className="mt-4" disabled={!canCreate} onClick={handleCreate}>
          {t("grossMargin.simulator.newCustomer.createQuote")}
        </Button>
      </CardContent>
    </Card>
  );
}
