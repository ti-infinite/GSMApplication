"use client";

import { useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { cn } from "@/shared/lib/utils";
import type { NewVarietyShape } from "./quote-simulator-new-customer-picker";
import { StepLabel } from "./step-label";

// The one place a genuinely brand-new product (never sold anywhere, not yet
// in NHUBEX) gets quoted -- unlike quote-simulator-new-customer-picker.tsx,
// there's no existing data to fall back on for ANY field here, including
// the customer: this could be a first-ever product for a customer we
// already sell to, so the customer step supports picking an existing one,
// not just typing a new one. Every field starts from nothing.
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
  const [variety, setVariety] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [measurementUnitValueText, setMeasurementUnitValueText] = useState("");
  const [packQtyText, setPackQtyText] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [existingCustomer, setExistingCustomer] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  const allWarehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);
  const knownCustomers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);
  const existingVarietyNames = useMemo(() => new Set(rows.map((r) => r.Variety.toLowerCase())), [rows]);

  const varietyTrimmed = variety.trim();
  const alreadyExists = varietyTrimmed.length > 0 && existingVarietyNames.has(varietyTrimmed.toLowerCase());

  const measurementUnitValue = Number(measurementUnitValueText);
  const shapeValid = measurementUnitValueText !== "" && Number.isFinite(measurementUnitValue) && measurementUnitValue > 0;

  const customerName = customerMode === "existing" ? existingCustomer : newCustomerName.trim();
  const canCreate =
    varietyTrimmed.length > 0 &&
    !alreadyExists &&
    !!warehouse &&
    shapeValid &&
    customerName.length > 0;

  function handleCreate() {
    const packQty = packQtyText === "" ? null : Number(packQtyText);
    onCreate(varietyTrimmed, warehouse, customerName, customerMode === "existing", {
      measurementUnitValue,
      packQty: packQty !== null && Number.isFinite(packQty) ? packQty : null,
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
            <CardTitle>New Variety</CardTitle>
            <CardDescription>
              Quote a product that&apos;s never been sold anywhere yet — for a customer we already
              sell to, or a brand-new one. Every field here starts blank; you&apos;ll fill in the
              costs by hand on the next step.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <StepLabel step={1} text="Variety name" active={varietyTrimmed.length > 0 && !alreadyExists} />
            <Input
              placeholder="e.g. TARRAGON - CLAMSHELL 0.5 OZ 3 PK Conventional"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
            />
            {alreadyExists && (
              <p className="text-xs text-destructive">
                This variety already exists — use &quot;Pick existing row&quot; or &quot;Quote a new
                customer&quot; instead.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <StepLabel step={2} text="Warehouse" active={!!warehouse} />
            <Select value={warehouse} onValueChange={(v) => v && setWarehouse(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a warehouse…" />
              </SelectTrigger>
              <SelectContent>
                {allWarehouses.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-input p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <StepLabel step={3} text="Measurement Unit (e.g. oz)" active={shapeValid} />
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 0.5"
              value={measurementUnitValueText}
              onChange={(e) => setMeasurementUnitValueText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pack Qty (optional)</label>
            <Input
              type="number"
              step="1"
              placeholder="e.g. 3"
              value={packQtyText}
              onChange={(e) => setPackQtyText(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <StepLabel step={4} text="Customer" active={customerName.length > 0} />
            <div className="flex gap-1 rounded-md border border-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCustomerMode("existing")}
                className={cn(
                  "rounded px-2 py-1",
                  customerMode === "existing" ? "bg-muted font-medium" : "text-muted-foreground"
                )}
              >
                Existing customer
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("new")}
                className={cn(
                  "rounded px-2 py-1",
                  customerMode === "new" ? "bg-muted font-medium" : "text-muted-foreground"
                )}
              >
                New customer
              </button>
            </div>
          </div>
          {customerMode === "existing" ? (
            <Select value={existingCustomer} onValueChange={(v) => v && setExistingCustomer(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer…" />
              </SelectTrigger>
              <SelectContent>
                {knownCustomers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="e.g. ACME GROCERY"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
          )}
        </div>

        <Button disabled={!canCreate} onClick={handleCreate}>
          Create quote
        </Button>
      </CardContent>
    </Card>
  );
}
