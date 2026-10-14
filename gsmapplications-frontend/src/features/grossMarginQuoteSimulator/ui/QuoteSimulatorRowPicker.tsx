import { useMemo, useState } from "react";
import { SearchCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { StepLabel } from "./StepLabel";

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
  const [varietySearch, setVarietySearch] = useState("");
  const [selectedVariety, setSelectedVariety] = useState(selected?.Variety ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState(selected?.Customer ?? "");
  const [selectedWarehouse, setSelectedWarehouse] = useState(selected?.Warehouse ?? "");

  const varieties = useMemo(() => Array.from(new Set(rows.map((r) => r.Variety))).sort(), [rows]);
  const filteredVarieties = useMemo(
    () => varieties.filter((v) => v.toLowerCase().includes(varietySearch.toLowerCase())),
    [varieties, varietySearch]
  );

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
            <CardTitle>Pick a row to simulate</CardTitle>
            <CardDescription>
              Select the real Variety, Customer, and Warehouse combination you want to model — its
              current live values become the baseline.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <StepLabel step={1} text="Variety" active={!!selectedVariety} />
            <Input
              placeholder="Filter varieties…"
              value={varietySearch}
              onChange={(e) => setVarietySearch(e.target.value)}
              className="mb-1.5"
            />
            <Combobox
              value={selectedVariety}
              onChange={(v) => v && handleVariety(v)}
              options={filteredVarieties.map((v) => ({ value: v, label: v }))}
              placeholder="Select a variety…"
            />
          </div>
          <div className="space-y-1.5">
            <StepLabel step={2} text="Customer" active={!!selectedCustomer} />
            <Combobox
              value={selectedCustomer}
              onChange={(v) => v && handleCustomer(v)}
              disabled={!selectedVariety}
              options={customersForVariety.map((c) => ({ value: c, label: c }))}
              placeholder={selectedVariety ? "Select a customer…" : "Pick a variety first"}
            />
          </div>
          <div className="space-y-1.5">
            <StepLabel step={3} text="Warehouse" active={!!selectedWarehouse} />
            <Combobox
              value={selectedWarehouse}
              onChange={(v) => v && handleWarehouse(v)}
              disabled={!selectedCustomer}
              options={warehousesForSelection.map((w) => ({ value: w, label: w }))}
              placeholder={selectedCustomer ? "Select a warehouse…" : "Pick a customer first"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
