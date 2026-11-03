import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, Factory } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { DataTable, type TableColumn } from "@/shared/ui/data-table";
import { formatCurrency, formatNumber } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { fetchPurchaseSuppliers, weightedAverage, type PurchaseSuppliersLookup, type SupplierPurchaseCost } from "../api/fetchPurchaseSuppliers";

// "Suppliers" next to the purchase cost field. The purchase cost is the
// average over every supplier of this SKU at this warehouse; this dialog
// lists each supplier's own average so the person quoting can tick which
// ones to count. Applying writes the weighted average of the ticked
// suppliers into the field as an override, and the quote recomputes.
export function QuoteSupplierPicker({
  baseline,
  mode,
  onApply,
}: {
  baseline: SalesRow;
  mode: "A" | "B" | "C" | "none";
  onApply: (purchaseCost: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [lookup, setLookup] = useState<PurchaseSuppliersLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [included, setIncluded] = useState<Set<string>>(() => new Set());

  const sku = baseline.CalculatedSKU;
  const skuMeasure = baseline.SKUMeasure;
  const warehouse = baseline.Warehouse;

  // Fetched on first open, dropped when the quoted product changes.
  useEffect(() => {
    setLookup(null);
    setIncluded(new Set());
  }, [sku, skuMeasure, warehouse]);

  useEffect(() => {
    if (!open || lookup !== null || !sku || !skuMeasure) return;
    let cancelled = false;
    setLoading(true);
    fetchPurchaseSuppliers(sku, skuMeasure, warehouse)
      .then((result) => {
        if (cancelled) return;
        setLookup(result);
        setIncluded(new Set(result.suppliers.map((s) => s.supplier)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lookup, sku, skuMeasure, warehouse]);

  const suppliers = lookup?.suppliers ?? [];
  const chosen = useMemo(() => suppliers.filter((s) => included.has(s.supplier)), [suppliers, included]);
  const average = weightedAverage(chosen);
  const perPound = lookup?.flag === 0;
  // The data is by the pound or packed depending on what was bought; say so
  // when that does not match how this quote is sourced.
  const basisMismatch = lookup?.flag !== null && lookup?.flag !== undefined && ((mode === "A" && lookup.flag === 0) || (mode === "B" && lookup.flag === 1));

  function toggle(name: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const columns: TableColumn<SupplierPurchaseCost>[] = [
    {
      key: "include",
      header: "",
      align: "center",
      render: (s) => {
        const on = included.has(s.supplier);
        return (
          <span className={cn("inline-flex", on ? "text-success" : "text-muted-foreground")} aria-pressed={on} role="button" aria-label={s.supplier}>
            {on ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
          </span>
        );
      },
    },
    {
      key: "supplier",
      header: t("grossMargin.simulator.suppliers.supplier"),
      sortable: true,
      render: (s) => <span className={cn(!included.has(s.supplier) && "text-muted-foreground line-through")}>{s.supplier}</span>,
    },
    {
      key: "avgPrice",
      header: perPound ? t("grossMargin.simulator.suppliers.pricePerLb") : t("grossMargin.simulator.suppliers.priceUnit"),
      align: "right",
      sortable: true,
      render: (s) => <span className={cn("font-mono tabular-nums", !included.has(s.supplier) && "text-muted-foreground")}>{formatCurrency(s.avgPrice)}</span>,
    },
    {
      key: "transactions",
      header: t("grossMargin.simulator.suppliers.transactions"),
      align: "right",
      sortable: true,
      hideMobile: true,
      render: (s) => <span className="font-mono text-muted-foreground tabular-nums">{formatNumber(s.transactions, 0)}</span>,
    },
  ];

  if (!sku || !skuMeasure) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        title={t("grossMargin.simulator.suppliers.title")}
      >
        <Factory className="size-3" aria-hidden="true" />
        {t("grossMargin.simulator.suppliers.button")}
      </button>

      {open && (
        <Dialog open onOpenChange={(next) => !next && setOpen(false)}>
          <DialogContent className="flex max-h-[90vh] max-w-xl flex-col">
            <DialogHeader className="pr-14">
              <DialogTitle>{t("grossMargin.simulator.suppliers.title")}</DialogTitle>
              <DialogDescription>
                {baseline.Variety} · {warehouse}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <p className="text-sm text-muted-foreground">{t("grossMargin.simulator.suppliers.description")}</p>
              <DataTable<SupplierPurchaseCost>
                columns={columns}
                data={suppliers}
                rowKey={(s) => s.supplier}
                loading={loading}
                emptyMessage={t("grossMargin.simulator.suppliers.empty")}
                onRowClick={(s) => toggle(s.supplier)}
              />
              {basisMismatch && <p className="text-xs text-warning">{t("grossMargin.simulator.suppliers.basisMismatch")}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
              <p className="text-sm text-muted-foreground">
                {t("grossMargin.simulator.suppliers.average", { count: chosen.length })}{" "}
                <span className="font-mono font-semibold text-foreground tabular-nums">{formatCurrency(average)}</span>
              </p>
              <Button
                disabled={average === null}
                onClick={() => {
                  if (average !== null) onApply(average);
                  setOpen(false);
                }}
              >
                {t("grossMargin.simulator.suppliers.apply")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
