import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { formatCurrency } from "@/shared/lib/format";
import { putRebate } from "../api/putRebate";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

// Rebate doesn't fit the reference-table Add/Edit/Delete shape -- every
// in-scope customer already has an implicit $0.00 rebate
// (db_ms.ClientAttributes), so this is a "pick a customer, set a value"
// upsert, closer to Commission's own card than to yields-card.tsx/etc.
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      await putRebate(selectedCustomer, rebateValue);
      toast.success(`Rebate set to ${formatCurrency(rebateValue)} for ${selectedCustomer}.`);
      setValueText("");
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update rebate.");
    } finally {
      setIsSubmitting(false);
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
              placeholder="Filter customers…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="mb-1.5"
            />
            <Combobox
              value={selectedCustomer}
              onChange={(v) => v && setSelectedCustomer(v)}
              options={filteredCustomers.map((c) => ({ value: c, label: c }))}
              placeholder="Select a customer…"
            />
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

        <Button onClick={handleApply} disabled={isSubmitting || !selectedCustomer}>
          {isSubmitting ? "Applying…" : "Apply Rebate"}
        </Button>
      </CardContent>
    </Card>
  );
}
