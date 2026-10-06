"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { formatCurrency } from "@/shared/lib/format";
import { putRebate } from "@/shared/lib/rebate-client";
import type { RebateRow } from "@/entities/gross-margin-rebate";
import type { SalesRow } from "@/entities/gross-margin-sales-row";

// Rebate doesn't fit the reference-table Add/Edit/Delete shape (§5 of the
// plan) -- every in-scope customer already has an implicit $0.00 rebate
// (db_ms.ClientAttributes), so this is a "pick a customer, set a value"
// upsert, structurally closer to Commission's own card than to
// yields-card.tsx/etc.
export function RebateCard({
  rows,
  rebates,
  onApplied,
}: {
  rows: SalesRow[];
  rebates: RebateRow[];
  onApplied: () => void;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [valueText, setValueText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const customers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);
  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]
  );

  const currentRebate = useMemo(
    () => rebates.find((r) => r.Customer === selectedCustomer)?.Rebate ?? null,
    [rebates, selectedCustomer]
  );

  async function handleApply() {
    const rebateValue = Number(valueText);
    if (!selectedCustomer) {
      toast.error("Pick a customer first.");
      return;
    }
    if (valueText === "" || Number.isNaN(rebateValue) || rebateValue < 0) {
      toast.error("Enter a rebate of $0 or more.");
      return;
    }

    setSubmitting(true);
    try {
      await putRebate(selectedCustomer, rebateValue);
      toast.success(`Rebate set to ${formatCurrency(rebateValue)} for ${selectedCustomer}.`);
      setValueText("");
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update rebate.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rebate</CardTitle>
        <CardDescription>
          A flat per-unit dollar amount subtracted from Avg Unit Sale Price, per customer — sourced
          from db_ms.Clients (shared ERP data), written directly since it's the same row
          db_ai.Sales already reads.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="rebate" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Customer</label>
            <Input
              placeholder="Search customers…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="mb-1.5"
            />
            <Select value={selectedCustomer} onValueChange={(v) => v && setSelectedCustomer(v)}>
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
            {selectedCustomer && (
              <p className="text-xs text-muted-foreground">
                Current rebate: {formatCurrency(currentRebate)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">New rebate ($)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 0.10"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleApply} disabled={submitting || !selectedCustomer}>
          {submitting ? "Applying…" : "Apply Rebate"}
        </Button>
      </CardContent>
    </Card>
  );
}
