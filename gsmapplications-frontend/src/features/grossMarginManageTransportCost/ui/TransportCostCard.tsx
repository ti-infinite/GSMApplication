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

const TYPE_OPTIONS = ["R", "P"];
const PACKAGING_OPTIONS = ["CLA", "BAG", "BOX"];
// Sentinel for the Select control only -- never sent to the relay. An
// unset Warehouse means "applies regardless of warehouse" (every
// division's real behavior before Market Basket, the first customer
// genuinely fulfilled from more than one warehouse for the same product).
const ANY_WAREHOUSE = "__any__";

export function TransportCostCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { values: divisions } = useReferenceSearch(rows, (r) => r.Customer);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [warehouse, setWarehouse] = useState(ANY_WAREHOUSE);
  const [packQtyText, setPackQtyText] = useState("");
  const [type, setType] = useState("");
  const [packaging, setPackaging] = useState("");
  const [measurementUnitText, setMeasurementUnitText] = useState("");
  const [qtyText, setQtyText] = useState("");
  const [boxesXPalletText, setBoxesXPalletText] = useState("");
  const [palletCostText, setPalletCostText] = useState("");
  const { isSubmitting, conflictError, submit } = useSubmitWithConflict();

  const warehouses = useMemo(() => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(), [rows]);

  async function handleApply() {
    const measurementUnitValue = Number(measurementUnitText);
    if (!selectedDivision) {
      toast.error("Pick a customer/division first.");
      return;
    }
    if (!measurementUnitText || Number.isNaN(measurementUnitValue) || measurementUnitValue <= 0) {
      toast.error("Enter a package size greater than 0.");
      return;
    }
    // Type/Packaging/Qty are NOT NULL in db_ai.DivisionTransportCost -- every
    // real row has all three, unlike BoxesXPallet/PalletCost which have
    // genuine blank cases in the source data (see the relay's own comment).
    if (!type || !packaging) {
      toast.error("Pick a Type and Packaging.");
      return;
    }
    const qty = Number(qtyText);
    if (!qtyText || Number.isNaN(qty) || qty <= 0) {
      toast.error("Enter a Qty greater than 0.");
      return;
    }
    const boxesXPallet = boxesXPalletText ? Number(boxesXPalletText) : null;
    if (boxesXPallet !== null && boxesXPallet <= 0) {
      toast.error("Boxes per pallet must be greater than 0.");
      return;
    }
    const packQty = packQtyText ? Number(packQtyText) : null;
    if (packQty !== null && (Number.isNaN(packQty) || packQty <= 0)) {
      toast.error("Pack size must be a whole number greater than 0.");
      return;
    }

    const body: Record<string, unknown> = {
      divisionName: selectedDivision,
      measurementUnitValue,
      type,
      packaging,
      qty,
      boxesXPallet: boxesXPallet ?? undefined,
      palletCost: palletCostText ? Number(palletCostText) : undefined,
      warehouse: warehouse === ANY_WAREHOUSE ? undefined : warehouse,
      packQty: packQty ?? undefined,
    };

    await submit(
      () =>
        relayFetch("/transport-cost", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      {
        conflictMessage: "A transport cost already exists for this combination — see the table below.",
        defaultErrorMessage: "Failed to add transport cost.",
        onSuccess: () => {
          toast.success(`Transport cost added for ${selectedDivision}.`);
          setSelectedDivision("");
          setWarehouse(ANY_WAREHOUSE);
          setPackQtyText("");
          setType("");
          setPackaging("");
          setMeasurementUnitText("");
          setQtyText("");
          setBoxesXPalletText("");
          setPalletCostText("");
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transport Cost</CardTitle>
        <CardDescription>
          Per-customer, per-package-size transport cost — feeds the Transport column for every
          variety sold to that customer at that size.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="transport-cost" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Customer</label>
            <Combobox
              value={selectedDivision}
              onChange={(v) => v && setSelectedDivision(v)}
              options={divisions.map((d) => ({ value: d, label: d }))}
              placeholder="Select a customer…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Warehouse</label>
            <Combobox
              value={warehouse}
              onChange={(v) => v && setWarehouse(v)}
              options={[
                { value: ANY_WAREHOUSE, label: "Any warehouse" },
                ...warehouses.map((w) => ({ value: w, label: w })),
              ]}
              placeholder="Any warehouse"
            />
            <p className="text-[11px] text-muted-foreground">
              Only set this if the same customer ships from more than one warehouse at different costs.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Package size</label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 1"
              value={measurementUnitText}
              onChange={(e) => setMeasurementUnitText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pack size</label>
            <Input
              type="number"
              step="1"
              placeholder="Any pack size"
              value={packQtyText}
              onChange={(e) => setPackQtyText(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Only set this if the same package size ships in more than one pack count (e.g. 3-pack vs 6-pack).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Combobox
              value={type}
              onChange={(v) => setType(v || "")}
              options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
              placeholder="—"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Packaging</label>
            <Combobox
              value={packaging}
              onChange={(v) => setPackaging(v || "")}
              options={PACKAGING_OPTIONS.map((p) => ({ value: p, label: p }))}
              placeholder="—"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Qty</label>
            <Input
              type="number"
              step="1"
              placeholder="—"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Boxes/Pallet</label>
            <Input
              type="number"
              step="1"
              placeholder="—"
              value={boxesXPalletText}
              onChange={(e) => setBoxesXPalletText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pallet Cost</label>
            <Input
              type="number"
              step="0.01"
              placeholder="—"
              value={palletCostText}
              onChange={(e) => setPalletCostText(e.target.value)}
            />
          </div>
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button
          onClick={handleApply}
          disabled={isSubmitting || !selectedDivision || !type || !packaging || !qtyText}
        >
          {isSubmitting ? "Adding…" : "Add Transport Cost"}
        </Button>
      </CardContent>
    </Card>
  );
}
