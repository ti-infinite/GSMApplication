import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, Check, CheckCircle2, Circle, Pencil, Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DataTable, type TableColumn } from "@/shared/ui/data-table";
import { FilterBar, FilterField } from "@/shared/ui/filter-bar";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { ErrorState } from "@/shared/components/ErrorState";
import { formatNumber } from "@/shared/lib/format";
import { decimalInputProps, parseDecimal } from "@/shared/lib/formValidation";
import {
  confirmedSlot,
  parseShipDate,
  useLogistics,
  useLogisticsFilters,
  useUpdateLogisticsRow,
  type CarrierSlot,
  type LogisticsRow,
} from "@/entities/logistics";
import { LogisticsAlarmIcon, LogisticsLinesDialog } from "@/features/logisticsCarriers";

const ALL = "all";
const PAGE_SIZE = 25;
const MAX_CARRIER_LENGTH = 100;
const MAX_PALLETS = 9999999.999; // IHLogistics.Pallets is numeric(10,3)

interface Draft {
  pallets: string;
  carrierA: string;
  carrierB: string;
  confirmed: CarrierSlot | null;
}

function draftFrom(row: LogisticsRow): Draft {
  return {
    pallets: row.Pallets === null ? "" : String(row.Pallets),
    carrierA: row.CarrierA ?? "",
    carrierB: row.CarrierB ?? "",
    confirmed: confirmedSlot(row),
  };
}

// Default view: ship dates from 10 days ago to one month ahead. The service
// serves a wider window (30 days back plus every future shipment), so the
// picker can be widened to see the rest.
function defaultRange(): DateRange {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 10);
  const to = new Date(today);
  to.setMonth(to.getMonth() + 1);
  return { from, to };
}

// Case- and spacing-insensitive text for the search filters ("BIG  Y" matches "big y").
const normalize = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function Hint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// The Logistics page: every upcoming shipment (db_srv.IHLogistics) with its
// pallet count, two carrier options and the confirmed one in green. A row is
// edited in place (double-click or the pencil), the circle next to a carrier
// marks it as the confirmed one, and the warning triangle at the right end
// flags shipments close to their ship date with nothing confirmed. The
// invoice number opens the shipment's lines.
export function LogisticsTable() {
  const { t, i18n } = useTranslation();
  const { rows, isLoading, error, refetch } = useLogistics();
  const { filters } = useLogisticsFilters();
  const updateRow = useUpdateLogisticsRow();
  const saving = updateRow.isPending;

  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState(ALL);
  const [dc, setDc] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(defaultRange);
  const [stagedRange, setStagedRange] = useState<DateRange | undefined>(range);
  const [rangeOpen, setRangeOpen] = useState(false);

  const [selected, setSelected] = useState<LogisticsRow | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // Warehouse options come from the ERP master data (all warehouses), not only
  // from what is in the logistics table today.
  const warehouseOptions = useMemo(
    () => [{ value: ALL, label: t("logistics.filters.allWhs") }, ...filters.warehouses.map((w) => ({ value: w.code, label: w.name }))],
    [filters.warehouses, t]
  );

  const filtered = useMemo(() => {
    const needle = normalize(search);
    const dcNeedle = normalize(dc);
    const from = range?.from ? new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate()) : null;
    const to = range?.to ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()) : from;
    return rows.filter((r) => {
      if (needle && !normalize(r.Invoice).includes(needle) && !normalize(r.PO).includes(needle)) return false;
      if (warehouse !== ALL && r.WHS !== warehouse) return false;
      if (dcNeedle && !normalize(r.Division).includes(dcNeedle)) return false;
      if (from) {
        const ship = parseShipDate(r.DateShip);
        if (!ship || ship < from || (to && ship > to)) return false;
      }
      return true;
    });
  }, [rows, search, warehouse, dc, range]);

  const fmtDate = (iso: string | null) => {
    const d = parseShipDate(iso);
    return d ? d.toLocaleDateString(i18n.language, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  };
  const rangeLabel = range?.from
    ? range.to
      ? `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
      : format(range.from, "dd/MM/yyyy")
    : t("logistics.filters.selectDateRange");

  // ── Inline editing ──────────────────────────────────────────────────
  function startEdit(row: LogisticsRow) {
    if (saving) return;
    setEditingId(row.ID);
    setDraft(draftFrom(row));
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }
  function setDraftField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }
  function toggleConfirmed(slot: CarrierSlot) {
    setDraft((d) => (d ? { ...d, confirmed: d.confirmed === slot ? null : slot } : d));
  }

  async function saveEdit(row: LogisticsRow) {
    if (!draft) return;
    const carrierA = draft.carrierA.trim();
    const carrierB = draft.carrierB.trim();
    if (carrierA.length > MAX_CARRIER_LENGTH || carrierB.length > MAX_CARRIER_LENGTH) {
      toast.error(t("logistics.edit.tooLong"));
      return;
    }
    const palletsText = draft.pallets.trim();
    const parsedPallets = palletsText === "" ? null : parseDecimal(palletsText);
    if (typeof parsedPallets === "symbol" || (typeof parsedPallets === "number" && (parsedPallets < 0 || parsedPallets > MAX_PALLETS))) {
      toast.error(t("logistics.edit.palletsInvalid"));
      return;
    }
    const pallets: number | null = parsedPallets;
    const confirmedName = draft.confirmed === "A" ? carrierA : draft.confirmed === "B" ? carrierB : "";
    if (draft.confirmed && !confirmedName) {
      toast.error(t("logistics.edit.confirmNeedsCarrier"));
      return;
    }
    try {
      await updateRow.mutateAsync({
        id: row.ID,
        body: { CarrierA: carrierA || null, CarrierB: carrierB || null, Pallets: pallets, Confirmed: draft.confirmed },
      });
      toast.success(t("logistics.edit.saved", { invoice: row.Invoice }));
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("logistics.edit.failed"));
    }
  }

  function onEditKey(e: KeyboardEvent<HTMLInputElement>, row: LogisticsRow) {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveEdit(row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  const stop = { onClick: (e: React.MouseEvent) => e.stopPropagation(), onDoubleClick: (e: React.MouseEvent) => e.stopPropagation() };

  // ── Cells ───────────────────────────────────────────────────────────
  const invoiceCell = (r: LogisticsRow) => (
    <button
      type="button"
      className="font-medium text-primary hover:underline"
      onClick={(e) => {
        e.stopPropagation();
        setSelected(r);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {r.Invoice}
    </button>
  );

  const palletsCell = (r: LogisticsRow) =>
    editingId === r.ID && draft ? (
      <Input
        {...decimalInputProps}
        {...stop}
        value={draft.pallets}
        onChange={(e) => setDraftField("pallets", e.target.value)}
        onKeyDown={(e) => onEditKey(e, r)}
        className="h-8 w-20 text-right"
        aria-label={t("logistics.columns.pallets")}
        autoFocus
      />
    ) : (
      <span className="font-mono tabular-nums">{r.Pallets !== null ? formatNumber(r.Pallets, 0) : "—"}</span>
    );

  const carrierCell = (r: LogisticsRow, slot: CarrierSlot) => {
    const name = slot === "A" ? r.CarrierA : r.CarrierB;
    const isConfirmed = confirmedSlot(r) === slot;
    if (editingId === r.ID && draft) {
      const value = slot === "A" ? draft.carrierA : draft.carrierB;
      const chosen = draft.confirmed === slot;
      return (
        <div className="flex items-center gap-1.5" {...stop}>
          <Hint label={t("logistics.edit.confirmThis")}>
            <button
              type="button"
              onClick={() => toggleConfirmed(slot)}
              disabled={!value.trim()}
              aria-pressed={chosen}
              aria-label={t("logistics.edit.confirmThis")}
              className={cn("shrink-0 rounded-full disabled:opacity-30", chosen ? "text-success" : "text-muted-foreground hover:text-foreground")}
            >
              {chosen ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
            </button>
          </Hint>
          <Input
            value={value}
            onChange={(e) => setDraftField(slot === "A" ? "carrierA" : "carrierB", e.target.value)}
            onKeyDown={(e) => onEditKey(e, r)}
            placeholder={t("logistics.edit.carrierPlaceholder")}
            className="h-8 w-36"
            aria-label={slot === "A" ? t("logistics.columns.carrierA") : t("logistics.columns.carrierB")}
          />
        </div>
      );
    }
    if (!name) return <span className="text-muted-foreground">—</span>;
    return (
      <Hint label={name}>
        {isConfirmed ? (
          <span className="inline-flex max-w-44 items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 font-semibold text-success">
            <Check className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{name}</span>
          </span>
        ) : (
          <span className="block max-w-40 truncate">{name}</span>
        )}
      </Hint>
    );
  };

  const actionsCell = (r: LogisticsRow) => (
    <div className="flex items-center justify-end gap-0.5" {...stop}>
      {editingId === r.ID ? (
        <>
          <Hint label={t("logistics.edit.save")}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:bg-success/10 hover:text-success"
              onClick={() => saveEdit(r)}
              disabled={saving}
              aria-label={t("logistics.edit.save")}
            >
              <Check className="size-4" aria-hidden="true" />
            </Button>
          </Hint>
          <Hint label={t("logistics.edit.cancel")}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={cancelEdit}
              disabled={saving}
              aria-label={t("logistics.edit.cancel")}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </Hint>
        </>
      ) : (
        <>
          <Hint label={t("logistics.edit.edit")}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => startEdit(r)}
              aria-label={t("logistics.edit.edit")}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
          </Hint>
          <LogisticsAlarmIcon row={r} />
        </>
      )}
    </div>
  );

  const columns: TableColumn<LogisticsRow>[] = [
    { key: "Invoice", header: t("logistics.columns.invoice"), sortable: true, render: invoiceCell },
    { key: "PO", header: t("logistics.columns.po"), sortable: true, render: (r) => r.PO ?? "—" },
    { key: "WHS", header: t("logistics.columns.whs"), sortable: true, render: (r) => r.WHS ?? "—" },
    {
      key: "Division",
      header: t("logistics.columns.dc"),
      sortable: true,
      render: (r) =>
        r.Division ? (
          <Hint label={r.Division}>
            <span className="block max-w-72 truncate">{r.Division}</span>
          </Hint>
        ) : (
          "—"
        ),
    },
    {
      key: "DateShip",
      header: t("logistics.columns.shipDate"),
      sortable: true,
      render: (r) => <span className="whitespace-nowrap">{fmtDate(r.DateShip)}</span>,
    },
    { key: "Pallets", header: t("logistics.columns.pallets"), align: "right", sortable: true, render: palletsCell },
    { key: "CarrierA", header: t("logistics.columns.carrierA"), render: (r) => carrierCell(r, "A") },
    { key: "CarrierB", header: t("logistics.columns.carrierB"), render: (r) => carrierCell(r, "B") },
    { key: "actions", header: "", align: "right", hideMobile: true, render: actionsCell },
  ];

  const mobileCard = (r: LogisticsRow) => (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {invoiceCell(r)}
            <LogisticsAlarmIcon row={r} />
          </div>
          <p className="text-sm text-foreground break-words">{r.Division ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {r.PO ? `${t("logistics.columns.po")} ${r.PO} · ` : ""}
            {r.WHS} · {fmtDate(r.DateShip)}
          </p>
        </div>
        {actionsCell(r)}
      </div>
      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{t("logistics.columns.pallets")}</dt>
          <dd>{palletsCell(r)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{t("logistics.columns.carrierA")}</dt>
          <dd>{carrierCell(r, "A")}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{t("logistics.columns.carrierB")}</dt>
          <dd>{carrierCell(r, "B")}</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <>
      <FilterBar toggleLabel={t("logistics.filters.toggle")}>
        <FilterField label={t("logistics.filters.invoiceOrPo")} width="sm:w-60">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder={t("logistics.filters.searchInvoiceOrPo")}
              aria-label={t("logistics.filters.searchInvoiceOrPo")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </FilterField>
        <FilterField label={t("logistics.columns.whs")} width="sm:w-60">
          <Combobox value={warehouse} onChange={(v) => setWarehouse(v || ALL)} options={warehouseOptions} />
        </FilterField>
        <FilterField label={t("logistics.columns.dc")} width="sm:w-60">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder={t("logistics.filters.searchDc")}
              aria-label={t("logistics.filters.searchDc")}
              value={dc}
              onChange={(e) => setDc(e.target.value)}
              className="pl-8"
            />
          </div>
        </FilterField>
        <FilterField label={t("logistics.columns.shipDate")} width="sm:w-60">
          <div className="relative">
            <Popover
              open={rangeOpen}
              onOpenChange={(open) => {
                setRangeOpen(open);
                if (open) setStagedRange(range);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-8 w-full justify-start gap-2 px-2.5 py-1 text-sm font-normal", range?.from ? "pr-8 text-foreground" : "text-muted-foreground")}
                >
                  <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-left">{rangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={stagedRange} onSelect={setStagedRange} />
                <div className="border-t border-border p-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setRange(stagedRange);
                      setRangeOpen(false);
                    }}
                  >
                    {t("logistics.filters.applyDateRange")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {range?.from && (
              <button
                type="button"
                onClick={() => setRange(undefined)}
                aria-label={t("logistics.filters.clearDateRange")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </FilterField>
      </FilterBar>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <DataTable<LogisticsRow>
          columns={columns}
          data={filtered}
          rowKey={(r) => String(r.ID)}
          loading={isLoading}
          emptyMessage={rows.length === 0 ? t("logistics.table.empty") : t("logistics.table.noMatch")}
          mobileCard={mobileCard}
          onRowDoubleClick={startEdit}
          pageSize={PAGE_SIZE}
        />
      )}

      <LogisticsLinesDialog row={selected ? (rows.find((r) => r.ID === selected.ID) ?? selected) : null} onClose={() => setSelected(null)} />
    </>
  );
}
