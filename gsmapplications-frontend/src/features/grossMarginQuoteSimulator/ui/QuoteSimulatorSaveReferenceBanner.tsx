import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { getCurrentFieldValue, type QuoteOverrides, type RecomputeInputs, type SalesRowMode } from "../model/recompute";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import { ESTIMATE_KEY_BY_OVERRIDE, type FieldEstimate, type QuoteCostEstimates } from "../model/quoteCostEstimates";
import type { CostReferenceRow } from "@/entities/grossMarginCostReference";


const COST_REFERENCE_FIELD_MAP: Record<string, string> = {
  packingOverride: "packing",
  stickerOverride: "sticker",
  boxOverride: "box",
  labourProdOverride: "labourProd",
  labourRepackOverride: "labourRepack",
  labourAssemblerOverride: "labourAssembler",
  extraCostsOverride: "extraCosts",
};

/** True when the person typed a value into a field that lives on the Cost
 *  Reference row (so the banner can offer to update a row already on file). */
export function hasCostReferenceEdits(overrides: QuoteOverrides): boolean {
  return Object.keys(COST_REFERENCE_FIELD_MAP).some((k) => (overrides as Record<string, number | undefined>)[k] !== undefined);
}


export function QuoteSimulatorSaveReferenceBanner({
  mode,
  variety,
  warehouse,
  inputs,
  overrides,
  avgUnitPriceBase,
  calculatedSku,
  estimates,
  costReference = null,
  onSaved,
}: {
  mode: SalesRowMode;
  variety: string;
  warehouse: string;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
  avgUnitPriceBase: number | null;

  calculatedSku: string | null;
  // Comparable-product estimates behind the row (manual rows only). An
  // estimated value the user never touched is NOT saved as a real reference
  // unless they opt in below.
  estimates?: QuoteCostEstimates | null;
  // The row already on file for this variety + warehouse, when there is one:
  // saving then completes it (PUT) instead of creating a second one.
  costReference?: CostReferenceRow | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeEstimates, setIncludeEstimates] = useState(false);

  if (mode !== "A" && mode !== "B") return null;

  const isUntouchedEstimate = (overrideKey: string) => {
    if (!estimates) return false;
    if ((overrides as Record<string, number | undefined>)[overrideKey] !== undefined) return false;
    const estKey = ESTIMATE_KEY_BY_OVERRIDE[overrideKey];
    return estKey ? (estimates[estKey] as FieldEstimate).source === "estimated" : false;
  };


  const packQty = inputs.baseline.PackQty && inputs.baseline.PackQty > 0 ? inputs.baseline.PackQty : 1;
  const costBody: Record<string, number> = {};
  let skippedEstimates = 0;
  for (const [overrideKey, field] of Object.entries(COST_REFERENCE_FIELD_MAP)) {
    const value = getCurrentFieldValue(overrideKey, inputs, overrides, avgUnitPriceBase);
    if (value === null) continue;
    if (!includeEstimates && isUntouchedEstimate(overrideKey)) {
      skippedEstimates++;
      continue;
    }
    costBody[field] = field === "box" ? value * packQty : value;
  }
  let yieldValue = mode === "B" ? getCurrentFieldValue("yieldOverride", inputs, overrides, avgUnitPriceBase) : null;
  if (yieldValue !== null && !includeEstimates && isUntouchedEstimate("yieldOverride")) {
    skippedEstimates++;
    yieldValue = null;
  }
  const estimatedCount = includeEstimates
    ? [...Object.keys(COST_REFERENCE_FIELD_MAP), "yieldOverride"].filter(isUntouchedEstimate).length
    : skippedEstimates;

  const hasAnythingToSave = Object.keys(costBody).length > 0 || yieldValue !== null;
  if (!hasAnythingToSave && estimatedCount === 0) return null;

  async function handleSave() {
    setIsSubmitting(true);
    try {
   
      const tasks: { label: string; promise: Promise<Response> }[] = [];
      if (Object.keys(costBody).length > 0) {
        if (costReference) {
          // Full overwrite, so start from what is on file and lay the new values on top.
          const merged = {
            packing: costReference.Packing,
            sticker: costReference.Sticker,
            box: costReference.Box,
            labourProd: costReference.LabourProd,
            labourRepack: costReference.LabourRepack,
            labourAssembler: costReference.LabourAssembler,
            extraCosts: costReference.ExtraCosts,
            ...costBody,
          };
          tasks.push({
            label: t("grossMargin.simulator.saveReference.costReference"),
            promise: relayFetch(`/cost-reference/${costReference.Id}`, { method: "PUT", body: JSON.stringify(merged) }),
          });
        } else {
          const costReferenceBody: Record<string, unknown> = { variety, warehouse, ...costBody };
          if (calculatedSku) costReferenceBody.calculatedSku = calculatedSku;
          tasks.push({
            label: t("grossMargin.simulator.saveReference.costReference"),
            promise: relayFetch("/cost-reference", {
              method: "POST",
              body: JSON.stringify(costReferenceBody),
            }),
          });
        }
      }
      if (yieldValue !== null) {
        tasks.push({
          label: t("grossMargin.simulator.saveReference.yield"),
          promise: relayFetch("/yields", {
            method: "POST",
            body: JSON.stringify({ variety, yieldValue }),
          }),
        });
      }

      const outcomes = await Promise.all(
        tasks.map(async (t) => {
          const res = await t.promise;
          const json = await res.json().catch(() => ({}));
          return {
            label: t.label,
            ok: res.ok,
            status: res.status,
          
            error: json.detail as string | undefined,
            info: json.info as string | undefined,
          };
        })
      );

      const succeeded = outcomes.filter((o) => o.ok);
      const conflicted = outcomes.filter((o) => o.status === 409);
      const failed = outcomes.filter((o) => !o.ok && o.status !== 409);

      if (succeeded.length > 0) {
        toast.success(
          t("grossMargin.simulator.saveReference.saved", {
            items: succeeded.map((o) => o.label).join(t("grossMargin.simulator.saveReference.and")),
            variety,
            warehouse,
          })
        );
      }
      for (const s of succeeded) {
        if (s.info) toast.info(s.info);
      }
      if (conflicted.length > 0) {
        toast.warning(
          t("grossMargin.simulator.saveReference.conflict", {
            items: conflicted.map((o) => o.label).join(t("grossMargin.simulator.saveReference.and")),
          })
        );
      }
      for (const f of failed) {
        toast.error(
          t("grossMargin.simulator.saveReference.notSaved", {
            item: f.label,
            error: f.error ?? t("grossMargin.simulator.saveReference.unknownError"),
          })
        );
      }
      if (succeeded.length > 0 || conflicted.length > 0) onSaved();
    } catch {
      toast.error(t("grossMargin.common.serverUnreachable"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Save className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t("grossMargin.simulator.saveReference.title")}</CardTitle>
            <CardDescription>
              {t(costReference ? "grossMargin.simulator.saveReference.updateDescription" : "grossMargin.simulator.saveReference.description", { variety, warehouse })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {estimatedCount > 0 && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={includeEstimates}
                onChange={(e) => setIncludeEstimates(e.target.checked)}
              />
              {t("grossMargin.simulator.saveReference.includeEstimates", { n: estimatedCount })}
            </label>
            {!includeEstimates && (
              <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.saveReference.estimatesExcluded")}</p>
            )}
          </div>
        )}
        <Button onClick={handleSave} disabled={isSubmitting || !hasAnythingToSave}>
          {isSubmitting ? t("grossMargin.simulator.saveReference.saving") : t("grossMargin.simulator.saveReference.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
