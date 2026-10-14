import { useMemo, useState } from "react";
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

const FIELDS = [
  { key: "packing", label: "Packing" },
  { key: "sticker", label: "Sticker" },
  { key: "box", label: "Box" },
  { key: "labourProd", label: "Labour (Prod)" },
  { key: "labourRepack", label: "Labour (Repack)" },
  { key: "labourAssembler", label: "Labour (Assembler)" },
] as const;

export function CostReferenceCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { search: varietySearch, setSearch: setVarietySearch, filtered: filteredVarieties } = useReferenceSearch(
    rows,
    (r) => r.Variety
  );
  const [selectedVariety, setSelectedVariety] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const warehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);

  async function handleApply() {
    if (!selectedVariety || !selectedWarehouse) {
      toast.error("Pick a variety and warehouse first.");
      return;
    }
    const body: Record<string, unknown> = { variety: selectedVariety, warehouse: selectedWarehouse };
    for (const f of FIELDS) {
      const text = texts[f.key];
      if (text) body[f.key] = Number(text);
    }

    await submit(
      () =>
        relayFetch("/cost-reference", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      {
        conflictMessage: "A cost reference already exists for this combination — see the table below.",
        defaultErrorMessage: "Failed to add cost reference.",
        onSuccess: (json) => {
          if (json.warning) toast.warning(json.warning as string);
          toast.success(`Cost reference added for ${selectedVariety} at ${selectedWarehouse}.`);
          setSelectedVariety("");
          setSelectedWarehouse("");
          setTexts({});
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Reference</CardTitle>
        <CardDescription>
          Packing/Sticker/Box/Labour costs per variety and warehouse — leave a field blank for "not
          applicable" (never a guessed zero).
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="cost-reference" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Variety</label>
            <Input
              placeholder="Filter varieties…"
              value={varietySearch}
              onChange={(e) => setVarietySearch(e.target.value)}
              className="mb-1.5"
            />
            <Combobox
              value={selectedVariety}
              onChange={(v) => v && setSelectedVariety(v)}
              options={filteredVarieties.map((v) => ({ value: v, label: v }))}
              placeholder="Select a variety…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Warehouse</label>
            <Combobox
              value={selectedWarehouse}
              onChange={(v) => v && setSelectedWarehouse(v)}
              options={warehouses.map((w) => ({ value: w, label: w }))}
              placeholder="Select a warehouse…"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              <Input
                type="number"
                step="0.01"
                placeholder="—"
                value={texts[f.key] ?? ""}
                onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={isSubmitting || !selectedVariety || !selectedWarehouse}>
          {isSubmitting ? "Adding…" : "Add Cost Reference"}
        </Button>
      </CardContent>
    </Card>
  );
}
