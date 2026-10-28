import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { DataTable, type TableColumn } from "@/shared/ui/data-table";
import { formatNumber } from "@/shared/lib/format";
import { ErrorState } from "@/shared/components/ErrorState";
import { confirmedSlot, parseShipDate, useLogisticsLines, type LogisticsLine, type LogisticsRow } from "@/entities/logistics";
import { LogisticsAlarmIcon } from "./LogisticsAlarmIcon";

// Details of one shipment, opened from the invoice number: the shipment
// facts (customer, warehouse, delivery date, PO, carriers) and the invoice's
// lines from IH Sales -- what is being shipped and how much of it.
export function LogisticsLinesDialog({ row, onClose }: { row: LogisticsRow | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { lines, isLoading, error, refetch } = useLogisticsLines(row?.ID ?? null);
  if (!row) return null;

  const fmtDate = (iso: string | null) => {
    const d = parseShipDate(iso);
    return d ? d.toLocaleDateString(i18n.language, { dateStyle: "medium" }) : "—";
  };
  const confirmed = confirmedSlot(row);

  const columns: TableColumn<LogisticsLine>[] = [
    { key: "Row", header: "#", align: "right", hideMobile: true, render: (l) => <span className="text-muted-foreground">{l.Row}</span> },
    {
      key: "Description",
      header: t("logistics.details.columns.description"),
      sortable: true,
      render: (l) => <span className="block max-w-xl whitespace-normal break-words">{l.Description ?? "—"}</span>,
    },
    {
      key: "Qty",
      header: t("logistics.details.columns.quantity"),
      align: "right",
      sortable: true,
      render: (l) => <span className="font-mono tabular-nums">{l.Qty !== null ? formatNumber(l.Qty, 0) : "—"}</span>,
    },
  ];

  const carrier = (slot: "A" | "B") => {
    const name = slot === "A" ? row.CarrierA : row.CarrierB;
    if (!name) return <span className="text-muted-foreground">—</span>;
    const isConfirmed = confirmed === slot;
    return (
      <span className={isConfirmed ? "inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 font-semibold text-success" : undefined}>
        {isConfirmed && <Check className="size-3.5" aria-hidden="true" />}
        {name}
      </span>
    );
  };

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: t("logistics.columns.dc"), value: row.Division ?? "—" },
    { label: t("logistics.columns.whs"), value: row.WHS ?? "—" },
    { label: t("logistics.columns.deliveryDate"), value: fmtDate(row.DeliveryDate) },
    { label: t("logistics.columns.po"), value: row.PO ?? "—" },
    { label: t("logistics.columns.carrierA"), value: carrier("A") },
    { label: t("logistics.columns.carrierB"), value: carrier("B") },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader className="pr-14">
          <div className="flex items-center gap-2">
            <DialogTitle>{t("logistics.details.title", { invoice: row.Invoice })}</DialogTitle>
            <LogisticsAlarmIcon row={row} />
          </div>
          <DialogDescription className="sr-only">
            {row.Division} · {row.WHS}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="truncate font-medium text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>

          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <DataTable<LogisticsLine>
              columns={columns}
              data={lines}
              rowKey={(l) => String(l.Row)}
              loading={isLoading}
              emptyMessage={t("logistics.details.empty")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
