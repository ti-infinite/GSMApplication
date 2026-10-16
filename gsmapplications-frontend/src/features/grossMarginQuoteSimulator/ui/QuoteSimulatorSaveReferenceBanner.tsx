import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { getCurrentFieldValue, type QuoteOverrides, type RecomputeInputs, type SalesRowMode } from "../model/recompute";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// purchaseCostOverride is deliberately excluded -- CostReference has no
// purchase-cost column (Flag/PurchaseCost come from a real supplier match),
// so that number stays a one-off estimate for this quote only.
const COST_REFERENCE_FIELD_MAP: Record<string, string> = {
  packingOverride: "packing",
  stickerOverride: "sticker",
  boxOverride: "box",
  labourProdOverride: "labourProd",
  labourRepackOverride: "labourRepack",
  labourAssemblerOverride: "labourAssembler",
};

// Offers to persist the packaging/labor/yield numbers typed into a "no cost
// basis yet" quote as real CostReference/Yields rows, so the next quote for
// this Variety+Warehouse starts from real data. Transport Cost is not
// offered here -- DivisionTransportCost requires Type/Packaging values this
// flow has no source for, and guessing them would fabricate categorical data.
export function QuoteSimulatorSaveReferenceBanner({
  mode,
  variety,
  warehouse,
  inputs,
  overrides,
  avgUnitPriceBase,
  calculatedSku,
  onSaved,
}: {
  mode: SalesRowMode;
  variety: string;
  warehouse: string;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
  avgUnitPriceBase: number | null;
  // Product code built in the New Variety flow (null for every other flow).
  // Cost-Reference-only: never sent to /yields, since a wrong code could
  // orphan a Yield row or collide with a real product's SKU (CalculatedSKU
  // is Yields' primary key).
  calculatedSku: string | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (mode !== "A" && mode !== "B") return null;

  // Box is the one exception to "CostReference columns are per-unit": SQL
  // reads CostReference.Box as a whole-pack number and divides by PackQty
  // at query time, so the per-unit boxOverride must be multiplied back up
  // before saving, or the next quote would divide it by PackQty twice.
  const packQty = inputs.baseline.PackQty && inputs.baseline.PackQty > 0 ? inputs.baseline.PackQty : 1;
  const costBody: Record<string, number> = {};
  for (const [overrideKey, field] of Object.entries(COST_REFERENCE_FIELD_MAP)) {
    const value = getCurrentFieldValue(overrideKey, inputs, overrides, avgUnitPriceBase);
    if (value !== null) costBody[field] = field === "box" ? value * packQty : value;
  }
  const yieldValue = mode === "B" ? getCurrentFieldValue("yieldOverride", inputs, overrides, avgUnitPriceBase) : null;

  const hasAnythingToSave = Object.keys(costBody).length > 0 || yieldValue !== null;
  if (!hasAnythingToSave) return null;

  async function handleSave() {
    setIsSubmitting(true);
    try {
      // Named, not a flat array -- Cost Reference and Yield can genuinely
      // fail independently, so reporting this as one flat "failed" would
      // hide a real partial success.
      const tasks: { label: string; promise: Promise<Response> }[] = [];
      if (Object.keys(costBody).length > 0) {
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
            // Reads the relay's own error shape directly (relayFetch calls
            // it with no translation layer in between).
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
            <CardDescription>{t("grossMargin.simulator.saveReference.description", { variety, warehouse })}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? t("grossMargin.simulator.saveReference.saving") : t("grossMargin.simulator.saveReference.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
