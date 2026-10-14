import { useState } from "react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ReferenceBulkUpload } from "@/shared/ui/reference-bulk-upload";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useReferenceSearch } from "@/shared/lib/useReferenceSearch";
import { useSubmitWithConflict } from "@/shared/lib/useSubmitWithConflict";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

const WAREHOUSE_FIELDS = ["mia", "bos", "chi", "vin"] as const;

// Supplier has no existing dashboard data source, unlike every other
// identity field here -- stays free text, flagged with a caption, since
// there's no live table to validate it against server-side.
export function ExtraCostCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const [supplier, setSupplier] = useState("");
  const { values: skus } = useReferenceSearch(rows, (r) => r.CalculatedSKU);
  const [selectedSku, setSelectedSku] = useState("");
  const [measureUnitText, setMeasureUnitText] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  async function handleApply() {
    const measureUnit = Number(measureUnitText);
    if (!supplier.trim()) {
      toast.error("Enter a supplier name.");
      return;
    }
    if (!selectedSku) {
      toast.error("Pick a SKU first.");
      return;
    }
    if (!measureUnitText || Number.isNaN(measureUnit) || measureUnit <= 0) {
      toast.error("Enter a package size greater than 0.");
      return;
    }

    const body: Record<string, unknown> = {
      supplier: supplier.trim(),
      skuCalculated: selectedSku,
      measureUnit,
    };
    for (const key of WAREHOUSE_FIELDS) {
      const text = texts[key];
      if (text) body[key] = Number(text);
    }

    await submit(
      () =>
        relayFetch("/extra-cost", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      {
        conflictMessage: "An extra cost already exists for this combination — see the table below.",
        defaultErrorMessage: "Failed to add extra cost.",
        onSuccess: () => {
          toast.success(`Extra cost added for ${supplier} / ${selectedSku}.`);
          setSupplier("");
          setSelectedSku("");
          setMeasureUnitText("");
          setTexts({});
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Extra Cost</CardTitle>
        <CardDescription>
          Per-supplier, per-SKU landed cost adjustment by warehouse — applied before the
          transaction-weighted blend across suppliers, so it never bleeds onto other suppliers'
          prices for the same SKU.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="extra-cost" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Supplier</label>
            <Input
              placeholder="e.g. AGROAROMAS"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Must exactly match the purchasing-side supplier name.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">SKU</label>
            <Combobox
              value={selectedSku}
              onChange={(v) => v && setSelectedSku(v)}
              options={skus.map((s) => ({ value: s, label: s }))}
              placeholder="Select a SKU…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Package size</label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 16"
              value={measureUnitText}
              onChange={(e) => setMeasureUnitText(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WAREHOUSE_FIELDS.map((key) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{key.toUpperCase()}</label>
              <Input
                type="number"
                step="0.0001"
                placeholder="—"
                value={texts[key] ?? ""}
                onChange={(e) => setTexts((t) => ({ ...t, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !supplier.trim() || !selectedSku}>
          {isSubmitting ? "Adding…" : "Add Extra Cost"}
        </Button>
      </CardContent>
    </Card>
  );
}
