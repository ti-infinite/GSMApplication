import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { upsertCommission } from "../api/upsertCommission";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";

// REWRITE (2026-10-08): Commission moved from db_ai.CustomerCommission to
// db_ms.Clients/ClientAttributes -- same mechanism as Rebate, applies per
// Customer only now (never per Variety), so this card drops the whole
// variety-selection step the old version needed and becomes a "pick a
// customer, set a type + amount" upsert, structurally identical to
// RebateCard's own shape (see features/grossMarginManageRebate/ui/RebateCard.tsx).
export function CommissionCard({
  rows,
  commissions,
  onApplied,
}: {
  rows: SalesRow[];
  commissions: CommissionRow[];
  onApplied: () => void;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [mode, setMode] = useState<"percent" | "value">("percent");
  const [percentText, setPercentText] = useState("");
  const [valueText, setValueText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);

  const currentCommission = useMemo(
    () => commissions.find((c) => c.Customer === selectedCustomer) ?? null,
    [commissions, selectedCustomer]
  );

  function selectCustomer(customer: string) {
    setSelectedCustomer(customer);
    setPercentText("");
    setValueText("");
  }

  async function handleApply() {
    if (!selectedCustomer) {
      toast.error("Pick a customer first.");
      return;
    }
    const amountText = mode === "percent" ? percentText : valueText;
    const amountNum = Number(amountText);
    if (amountText === "" || Number.isNaN(amountNum) || amountNum < 0) {
      toast.error(mode === "percent" ? "Enter a commission percentage." : "Enter a commission value.");
      return;
    }

    setIsSubmitting(true);
    try {
      const commissionAmount = mode === "percent" ? amountNum / 100 : amountNum;
      await upsertCommission(selectedCustomer, mode, commissionAmount);
      toast.success(
        `Commission set to ${mode === "percent" ? formatPercent(commissionAmount) : formatCurrency(commissionAmount)} for ${selectedCustomer}.`
      );
      setPercentText("");
      setValueText("");
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update commission.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission</CardTitle>
        <CardDescription>
          A percentage or flat dollar amount subtracted from Avg Unit Sale Price, per customer —
          sourced from db_ms.Clients (shared ERP data), written directly since it's the same row
          db_ai.GMSales already reads.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="commission" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Customer</label>
            <Combobox
              value={selectedCustomer}
              onChange={(v) => v && selectCustomer(v)}
              options={customers.map((c) => ({ value: c, label: c }))}
              placeholder="Select a customer…"
            />
            {selectedCustomer && (
              <p className="text-xs text-muted-foreground">
                Current commission:{" "}
                {currentCommission
                  ? currentCommission.CommissionType === "percent"
                    ? formatPercent(currentCommission.CommissionAmount)
                    : formatCurrency(currentCommission.CommissionAmount)
                  : "none set"}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">New commission</label>
            <div className="flex gap-2 pb-1 text-xs">
              <button
                type="button"
                className={cn(mode === "percent" ? "font-semibold text-primary" : "text-muted-foreground")}
                onClick={() => setMode("percent")}
              >
                % percent
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                type="button"
                className={cn(mode === "value" ? "font-semibold text-primary" : "text-muted-foreground")}
                onClick={() => setMode("value")}
              >
                $ flat value
              </button>
            </div>
            {mode === "percent" ? (
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 10"
                value={percentText}
                onChange={(e) => setPercentText(e.target.value)}
              />
            ) : (
              <Input
                type="number"
                step="0.0001"
                placeholder="e.g. 0.15"
                value={valueText}
                onChange={(e) => setValueText(e.target.value)}
              />
            )}
          </div>
        </div>

        <Button onClick={handleApply} disabled={isSubmitting || !selectedCustomer}>
          {isSubmitting ? "Applying…" : "Apply Commission"}
        </Button>
      </CardContent>
    </Card>
  );
}
