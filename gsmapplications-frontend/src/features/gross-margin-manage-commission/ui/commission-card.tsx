"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { formatCurrency } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { cn } from "@/shared/lib/utils";
import { useReferenceSearch } from "@/shared/lib/use-reference-search";
import { useSubmitWithConflict } from "@/shared/lib/use-submit-with-conflict";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// "Applies to all" is just "every variety checked" -- no separate code path,
// so partially-deselecting after picking "all" behaves exactly as expected
// with no extra state to keep in sync.
export function CommissionCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { search: customerSearch, setSearch: setCustomerSearch, filtered: filteredCustomers } = useReferenceSearch(
    rows,
    (r) => r.Customer
  );
  // "" (never null/undefined) so the Select stays controlled across its
  // whole lifetime -- Base UI (like React) warns/misbehaves if a Select
  // switches from uncontrolled (undefined) to controlled after mount.
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedVarieties, setSelectedVarieties] = useState<Set<string>>(new Set());
  const [percentText, setPercentText] = useState("");
  const [valueText, setValueText] = useState("");
  const [lastEdited, setLastEdited] = useState<"percent" | "value">("percent");
  const { submitting, conflictError, setConflictError, submit } = useSubmitWithConflict();

  const varietiesForCustomer = useMemo(() => {
    if (!selectedCustomer) return [];
    return Array.from(new Set(rows.filter((r) => r.Customer === selectedCustomer).map((r) => r.Variety))).sort();
  }, [rows, selectedCustomer]);

  const avgPriceByVariety = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedCustomer) return map;
    const sums = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      if (r.Customer !== selectedCustomer || r.AvgUnitPrice === null) continue;
      const entry = sums.get(r.Variety) ?? { total: 0, count: 0 };
      entry.total += r.AvgUnitPrice;
      entry.count += 1;
      sums.set(r.Variety, entry);
    }
    for (const [variety, { total, count }] of sums) map.set(variety, total / count);
    return map;
  }, [rows, selectedCustomer]);

  const allSelected = varietiesForCustomer.length > 0 && selectedVarieties.size === varietiesForCustomer.length;

  function selectCustomer(customer: string) {
    setSelectedCustomer(customer);
    setSelectedVarieties(new Set());
    setConflictError(null);
  }

  function toggleVariety(variety: string, checked: boolean) {
    setConflictError(null);
    setSelectedVarieties((prev) => {
      const next = new Set(prev);
      if (checked) next.add(variety);
      else next.delete(variety);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setConflictError(null);
    setSelectedVarieties(checked ? new Set(varietiesForCustomer) : new Set());
  }

  const percentNum = percentText === "" ? null : Number(percentText);
  const valueNum = valueText === "" ? null : Number(valueText);
  const singleVarietySelected = selectedVarieties.size === 1 ? [...selectedVarieties][0] : null;

  // The $ field only makes sense for exactly one variety -- a flat dollar
  // amount doesn't generalize across varieties with different prices, per
  // the confirmed multi-variety behavior (one shared %, computed per-variety).
  const valueFieldEnabled = singleVarietySelected !== null;

  async function handleApply() {
    if (!selectedCustomer || selectedVarieties.size === 0) {
      toast.error("Pick a customer and at least one variety first.");
      return;
    }
    if (lastEdited === "percent" && (percentNum === null || Number.isNaN(percentNum))) {
      toast.error("Enter a commission percentage.");
      return;
    }
    if (lastEdited === "value" && (valueNum === null || Number.isNaN(valueNum))) {
      toast.error("Enter a commission value.");
      return;
    }

    await submit(
      () =>
        relayFetch("/commissions", {
          method: "POST",
          body: JSON.stringify({
            customer: selectedCustomer,
            varieties: Array.from(selectedVarieties),
            commissionType: lastEdited,
            ...(lastEdited === "percent"
              ? { commissionPercent: percentNum! / 100 }
              : { commissionValue: valueNum! }),
          }),
        }),
      {
        conflictMessage: "Commission already exists for one or more varieties — see below.",
        defaultErrorMessage: "Failed to apply commission.",
        onSuccess: () => {
          toast.success(
            `Commission applied to ${selectedVarieties.size} variet${selectedVarieties.size === 1 ? "y" : "ies"} for ${selectedCustomer}.`
          );
          setSelectedVarieties(new Set());
          setPercentText("");
          setValueText("");
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commissions</CardTitle>
        <CardDescription>
          Set a per-customer, per-variety commission — a percentage or flat dollar amount
          subtracted from Avg Unit Sale Price.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="commissions" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Customer</label>
            <Input
              placeholder="Search customers…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="mb-1.5"
            />
            <Select
              value={selectedCustomer}
              onValueChange={(v) => v && selectCustomer(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer…" />
              </SelectTrigger>
              <SelectContent>
                {filteredCustomers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedCustomer && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Varieties sold to {selectedCustomer}
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <Checkbox checked={allSelected} onCheckedChange={(c) => toggleSelectAll(!!c)} />
                Applies to all
              </label>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
              {varietiesForCustomer.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No varieties found for this customer.</p>
              ) : (
                <div className="space-y-1">
                  {varietiesForCustomer.map((v) => (
                    <label key={v} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                      <Checkbox
                        checked={selectedVarieties.has(v)}
                        onCheckedChange={(c) => toggleVariety(v, !!c)}
                      />
                      <span className="flex-1">{v}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatCurrency(avgPriceByVariety.get(v) ?? null)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedVarieties.size > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Commission %</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 10"
                value={percentText}
                onChange={(e) => {
                  setPercentText(e.target.value);
                  setLastEdited("percent");
                }}
                className={cn(lastEdited !== "percent" && "text-muted-foreground")}
              />
              {lastEdited === "percent" && percentNum !== null && !Number.isNaN(percentNum) && (
                <div className="space-y-0.5 pt-0.5 text-xs text-muted-foreground">
                  {Array.from(selectedVarieties).map((v) => {
                    const base = avgPriceByVariety.get(v);
                    const computed = base !== undefined ? base * (percentNum / 100) : null;
                    return (
                      <p key={v}>
                        {v}: {formatCurrency(computed)}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Commission $ {!valueFieldEnabled && "(select exactly one variety)"}
              </label>
              <Input
                type="number"
                step="0.0001"
                placeholder={valueFieldEnabled ? "e.g. 0.15" : "—"}
                value={valueText}
                disabled={!valueFieldEnabled}
                onChange={(e) => {
                  setValueText(e.target.value);
                  setLastEdited("value");
                }}
                className={cn(lastEdited !== "value" && "text-muted-foreground")}
              />
              {lastEdited === "value" &&
                valueFieldEnabled &&
                valueNum !== null &&
                !Number.isNaN(valueNum) &&
                (() => {
                  const base = avgPriceByVariety.get(singleVarietySelected!);
                  const computedPercent = base ? (valueNum / base) * 100 : null;
                  return (
                    <p className="pt-0.5 text-xs text-muted-foreground">
                      {computedPercent !== null
                        ? `≈ ${computedPercent.toFixed(2)}% of ${formatCurrency(base ?? null)}`
                        : "No price data for this variety"}
                    </p>
                  );
                })()}
            </div>
          </div>
        )}

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button
          onClick={handleApply}
          disabled={submitting || !selectedCustomer || selectedVarieties.size === 0}
        >
          {submitting ? "Applying…" : "Apply Commission"}
        </Button>
      </CardContent>
    </Card>
  );
}
