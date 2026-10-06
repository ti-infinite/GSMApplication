"use client";

import { useState } from "react";
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
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { useReferenceSearch } from "@/shared/lib/use-reference-search";
import { useSubmitWithConflict } from "@/shared/lib/use-submit-with-conflict";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// Yields is keyed by CalculatedSKU, but a human picks a Variety instead --
// the relay derives the real SKU code server-side via the same live join
// sql/16_cost_reference.sql already uses, so nobody ever has to type a SKU.
export function YieldsCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  const { search: varietySearch, setSearch: setVarietySearch, filtered: filteredVarieties } = useReferenceSearch(
    rows,
    (r) => r.Variety
  );
  const [selectedVariety, setSelectedVariety] = useState("");
  const [yieldText, setYieldText] = useState("");
  const { submitting, conflictError, submit } = useSubmitWithConflict();

  async function handleApply() {
    const yieldValue = Number(yieldText);
    if (!selectedVariety) {
      toast.error("Pick a variety first.");
      return;
    }
    if (!yieldText || Number.isNaN(yieldValue) || yieldValue <= 0) {
      toast.error("Enter a yield greater than 0.");
      return;
    }

    await submit(
      () =>
        relayFetch("/yields", {
          method: "POST",
          body: JSON.stringify({ variety: selectedVariety, yieldValue }),
        }),
      {
        conflictMessage: "A yield already exists for this SKU — see the table below.",
        defaultErrorMessage: "Failed to add yield.",
        onSuccess: (json) => {
          toast.success(`Yield added for ${selectedVariety} (SKU ${json.calculatedSKU}).`);
          setSelectedVariety("");
          setYieldText("");
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yields</CardTitle>
        <CardDescription>
          Pound-to-unit conversion factor per SKU — affects FinalPurPrice for pound-sourced rows only.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="yields" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Variety</label>
            <Input
              placeholder="Search varieties…"
              value={varietySearch}
              onChange={(e) => setVarietySearch(e.target.value)}
              className="mb-1.5"
            />
            <Select value={selectedVariety} onValueChange={(v) => v && setSelectedVariety(v)}>
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
            <label className="text-xs font-medium text-muted-foreground">Yield</label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 12"
              value={yieldText}
              onChange={(e) => setYieldText(e.target.value)}
            />
          </div>
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={submitting || !selectedVariety}>
          {submitting ? "Adding…" : "Add Yield"}
        </Button>
      </CardContent>
    </Card>
  );
}
