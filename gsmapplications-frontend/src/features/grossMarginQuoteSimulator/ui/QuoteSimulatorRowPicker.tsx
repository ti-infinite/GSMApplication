import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { Field } from "@/shared/ui/field";

// Modeled on cost-reference-card.tsx's search+Select picker, extended to
// three cascading dimensions since a SalesRow's real identity key is
// (Variety, Customer, Warehouse), not just Variety+Warehouse.
export function QuoteSimulatorRowPicker({
  rows,
  selected,
  onSelect,
}: {
  rows: SalesRow[];
  selected: SalesRow | null;
  onSelect: (row: SalesRow) => void;
}) {
  const { t } = useTranslation();
  const [selectedVariety, setSelectedVariety] = useState(selected?.Variety ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState(selected?.Customer ?? "");
  const [selectedWarehouse, setSelectedWarehouse] = useState(selected?.Warehouse ?? "");

  const varieties = useMemo(() => Array.from(new Set(rows.map((r) => r.Variety))).sort(), [rows]);

  const customersForVariety = useMemo(
    () =>
      Array.from(new Set(rows.filter((r) => r.Variety === selectedVariety).map((r) => r.Customer))).sort(),
    [rows, selectedVariety]
  );

  const warehousesForSelection = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((r) => r.Variety === selectedVariety && r.Customer === selectedCustomer)
            .map((r) => r.Warehouse)
        )
      ).sort(),
    [rows, selectedVariety, selectedCustomer]
  );

  function handleVariety(v: string) {
    setSelectedVariety(v);
    setSelectedCustomer("");
    setSelectedWarehouse("");
  }

  function handleCustomer(c: string) {
    setSelectedCustomer(c);
    setSelectedWarehouse("");
    // Auto-select when there's exactly one warehouse for this pair -- most
    // Variety+Customer combos only ship from one warehouse.
    const warehouses = Array.from(
      new Set(rows.filter((r) => r.Variety === selectedVariety && r.Customer === c).map((r) => r.Warehouse))
    );
    if (warehouses.length === 1) {
      setSelectedWarehouse(warehouses[0]);
      const row = rows.find((r) => r.Variety === selectedVariety && r.Customer === c && r.Warehouse === warehouses[0]);
      if (row) onSelect(row);
    }
  }

  function handleWarehouse(w: string) {
    setSelectedWarehouse(w);
    const row = rows.find((r) => r.Variety === selectedVariety && r.Customer === selectedCustomer && r.Warehouse === w);
    if (row) onSelect(row);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SearchCheck className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t("grossMargin.simulator.picker.title")}</CardTitle>
            <CardDescription>{t("grossMargin.simulator.picker.description")}</CardDescription>
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
          <Field label={t("grossMargin.common.fields.customer")} step={{ n: 2, active: !!selectedCustomer }}>
            <Combobox
              value={selectedCustomer}
              onChange={handleCustomer}
              disabled={!selectedVariety}
              options={customersForVariety.map((c) => ({ value: c, label: c }))}
              placeholder={selectedVariety ? t("grossMargin.common.selectCustomer") : t("grossMargin.simulator.picker.varietyFirst")}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.warehouse")} step={{ n: 3, active: !!selectedWarehouse }}>
            <Combobox
              value={selectedWarehouse}
              onChange={(v) => (v ? handleWarehouse(v) : setSelectedWarehouse(""))}
              disabled={!selectedCustomer}
              options={warehousesForSelection.map((w) => ({ value: w, label: w }))}
              placeholder={selectedCustomer ? t("grossMargin.common.selectWarehouse") : t("grossMargin.simulator.picker.customerFirst")}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
