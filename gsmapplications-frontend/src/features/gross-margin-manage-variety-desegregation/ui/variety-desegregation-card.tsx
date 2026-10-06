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

export function VarietyDesegregationCard({ rows, onApplied }: { rows: SalesRow[]; onApplied: () => void }) {
  // Both dropdowns source from the same live Variety set -- a "child" is
  // just as much a real Variety as a "parent" is, no separate data source.
  const { search: parentSearch, setSearch: setParentSearch, filtered: filteredParents } = useReferenceSearch(
    rows,
    (r) => r.Variety
  );
  const [selectedParent, setSelectedParent] = useState("");
  const { search: childSearch, setSearch: setChildSearch, filtered: filteredChildren } = useReferenceSearch(
    rows,
    (r) => r.Variety
  );
  const [selectedChild, setSelectedChild] = useState("");
  const [quantityText, setQuantityText] = useState("");
  // Pre-filled "1" -- the common (Mixed Herbs style) case needs no thought;
  // only a percentage-based blend like Poultry needs this changed (e.g. to
  // 0.333333 for an equal 3-way split).
  const [factorText, setFactorText] = useState("1");
  const { submitting, conflictError, submit } = useSubmitWithConflict();

  async function handleApply() {
    const quantity = Number(quantityText);
    if (!selectedParent || !selectedChild) {
      toast.error("Pick a parent and child variety first.");
      return;
    }
    if (!quantityText || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    const factor = factorText ? Number(factorText) : 1;
    if (!Number.isFinite(factor) || factor <= 0 || factor > 1) {
      toast.error("Factor must be greater than 0 and no more than 1.");
      return;
    }

    await submit(
      () =>
        relayFetch("/variety-desegregation", {
          method: "POST",
          body: JSON.stringify({ parentVariety: selectedParent, childVariety: selectedChild, quantity, factor }),
        }),
      {
        conflictMessage: "This parent/child pair already exists — see the table below.",
        defaultErrorMessage: "Failed to add row.",
        onSuccess: () => {
          toast.success(`Added ${selectedChild} to ${selectedParent}.`);
          setSelectedParent("");
          setSelectedChild("");
          setQuantityText("");
          setFactorText("1");
          onApplied();
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mixed Herb Composition</CardTitle>
        <CardDescription>
          Which single-herb varieties make up each mixed-herb blend, and how many of each — feeds
          the Purchase Cost calculation for "MIXED HERBS" varieties in Sales Explorer.
        </CardDescription>
        <CardAction>
          <ReferenceBulkUpload resourceId="variety-desegregation" onApplied={onApplied} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Parent (mixed-herb blend)</label>
            <Input
              placeholder="Search varieties…"
              value={parentSearch}
              onChange={(e) => setParentSearch(e.target.value)}
              className="mb-1.5"
            />
            <Select value={selectedParent} onValueChange={(v) => v && setSelectedParent(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select the blend…" />
              </SelectTrigger>
              <SelectContent>
                {filteredParents.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Child (single herb)</label>
            <Input
              placeholder="Search varieties…"
              value={childSearch}
              onChange={(e) => setChildSearch(e.target.value)}
              className="mb-1.5"
            />
            <Select value={selectedChild} onValueChange={(v) => v && setSelectedChild(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select the component herb…" />
              </SelectTrigger>
              <SelectContent>
                {filteredChildren.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="max-w-[160px] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Quantity</label>
            <Input
              type="number"
              step="1"
              min="0"
              placeholder="e.g. 12"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
            />
          </div>
          <div className="max-w-[160px] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Factor</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              max="1"
              value={factorText}
              onChange={(e) => setFactorText(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Leave as 1 unless this is a percentage-based blend (e.g. 0.333333 for an equal
              3-way split).
            </p>
          </div>
        </div>

        {conflictError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {conflictError}
          </div>
        )}

        <Button onClick={handleApply} disabled={submitting || !selectedParent || !selectedChild}>
          {submitting ? "Adding…" : "Add Component"}
        </Button>
      </CardContent>
    </Card>
  );
}
