import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
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
import { StepLabel } from "./StepLabel";

// Shared with quote-simulator-new-variety-picker.tsx -- both flows end up
// building a manual starting point (buildManualBaseline) from a typed
// Measurement Unit/Pack Qty shape, just reached via different tabs.
export interface NewVarietyShape {
  measurementUnitValue: number;
  packQty: number | null;
}

// Existing-catalog varieties only -- quoting a genuinely brand-new product
// (never sold anywhere) is the "New Variety" tab's job
// (quote-simulator-new-variety-picker.tsx), which also supports picking an
// EXISTING customer for that new product. This tab stays focused on its one
// axis: a product we already sell, a customer who's new to us.
export function QuoteSimulatorNewCustomerPicker({
  rows,
  onCreate,
}: {
  rows: SalesRow[];
  onCreate: (variety: string, warehouse: string, customerName: string) => void;
}) {
  const [varietySearch, setVarietySearch] = useState("");
  const [selectedVariety, setSelectedVariety] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [customerName, setCustomerName] = useState("");

  const varieties = useMemo(() => Array.from(new Set(rows.map((r) => r.Variety))).sort(), [rows]);
  const filteredVarieties = useMemo(
    () => varieties.filter((v) => v.toLowerCase().includes(varietySearch.toLowerCase())),
    [varieties, varietySearch]
  );
  // Every known warehouse, not filtered by Variety -- lets the user pick a
  // warehouse this Variety has never shipped from (falls to
  // buildManualBaseline in the parent), not just ones it already has data
  // for.
  const allWarehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);
  // Warehouses THIS Variety actually has real data for -- shown first and
  // auto-selected when there's exactly one, same as the old behavior. Fixed
  // 2026-09-09: originally allWarehouses was offered flat with no
  // indication of which ones had data, so picking any warehouse alphabetically
  // ahead of the real one silently landed on the blank manual-entry path
  // even for well-established products -- confirmed live, this made nearly
  // every "quote a new customer" attempt look like "no data anywhere."
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
            <CardTitle>Quote a new customer</CardTitle>
            <CardDescription>
              Pick a Variety we already sell for a real starting estimate. Missing a Warehouse or
              Cost Reference for this combination? You&apos;ll be able to fill it in by hand on the
              next step. Quoting a brand-new product? Use the &quot;New Variety&quot; tab instead.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <StepLabel step={1} text="Variety" active={!!selectedVariety} />
            <Input
              placeholder="Search varieties…"
              value={varietySearch}
              onChange={(e) => {
                setVarietySearch(e.target.value);
                if (e.target.value.trim() !== selectedVariety) setSelectedVariety("");
              }}
              className="mb-1.5"
            />
            <Select value={selectedVariety} onValueChange={(v) => v && handleVariety(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a variety…" />
              </SelectTrigger>
              <SelectContent>
                {filteredVarieties.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <StepLabel step={2} text="Warehouse" active={!!selectedWarehouse} />
            <Select value={selectedWarehouse} onValueChange={(v) => v && setSelectedWarehouse(v)} disabled={!selectedVariety}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedVariety ? "Select a warehouse…" : "Pick a variety first"} />
              </SelectTrigger>
              <SelectContent>
                {warehousesForVariety.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Ships from already</SelectLabel>
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
                    <SelectLabel>No data yet — starts blank</SelectLabel>
                    {otherWarehouses.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <StepLabel step={3} text="New customer name" active={customerName.trim().length > 0} />
            <Input
              placeholder="e.g. ACME GROCERY"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        </div>
        <Button className="mt-4" disabled={!canCreate} onClick={handleCreate}>
          Create quote
        </Button>
      </CardContent>
    </Card>
  );
}
