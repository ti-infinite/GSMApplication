import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Search, X } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { DataTable, type TableColumn } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Field } from "@/shared/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/format";
import { useLocale } from "@/shared/hooks/useLocale";
import { useSavedQuotes, type SavedQuoteRow } from "@/entities/grossMarginSavedQuote";
import { stashSavedQuoteForSimulator } from "@/features/grossMarginQuoteSimulator/model/savedQuotes";

const ALL = "all";
const PAGE_SIZE = 25;


export function SavedQuotesTable() {
  const { t, i18n } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { savedQuotes, isLoading, error } = useSavedQuotes();

  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState(ALL);
  const [variety, setVariety] = useState(ALL);
  const [warehouse, setWarehouse] = useState(ALL);
  const [selected, setSelected] = useState<SavedQuoteRow | null>(null);

  const customers = useMemo(() => Array.from(new Set(savedQuotes.map((q) => q.Customer))).sort(), [savedQuotes]);
  const varieties = useMemo(() => Array.from(new Set(savedQuotes.map((q) => q.Variety))).sort(), [savedQuotes]);
  const warehouses = useMemo(() => Array.from(new Set(savedQuotes.map((q) => q.Warehouse))).sort(), [savedQuotes]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return savedQuotes.filter(
      (q) =>
        (needle === "" || q.QuoteName.toLowerCase().includes(needle)) &&
        (customer === ALL || q.Customer === customer) &&
        (variety === ALL || q.Variety === variety) &&
        (warehouse === ALL || q.Warehouse === warehouse)
    );
  }, [savedQuotes, search, customer, variety, warehouse]);

  const hasActiveFilters = search.trim() !== "" || customer !== ALL || variety !== ALL || warehouse !== ALL;

  function resetFilters() {
    setSearch("");
    setCustomer(ALL);
    setVariety(ALL);
    setWarehouse(ALL);
  }

  function openInSimulator(q: SavedQuoteRow) {
    stashSavedQuoteForSimulator(q);
    navigate(`/${locale}/dashboard/artificial-intelligence/quotes/quote-simulator`);
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });

  const openButton = (q: SavedQuoteRow) => (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        openInSimulator(q);
      }}
    >
      <ExternalLink aria-hidden="true" />
      {t("grossMargin.reports.open")}
    </Button>
  );

  const columns: TableColumn<SavedQuoteRow>[] = [
    {
      key: "savedAt",
      header: t("grossMargin.reports.columns.savedAt"),
      sortable: true,
      sortValue: (q) => q.SavedAt,
      render: (q) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(q.SavedAt)}</span>,
    },
    {
      key: "name",
      header: t("grossMargin.reports.columns.name"),
      sortable: true,
      sortValue: (q) => q.QuoteName,
      render: (q) => <span className="font-medium">{q.QuoteName}</span>,
    },
    {
      key: "customer",
      header: t("grossMargin.common.fields.customer"),
      sortable: true,
      sortValue: (q) => q.Customer,
      render: (q) => q.Customer,
    },
    {
      key: "variety",
      header: t("grossMargin.common.fields.variety"),
      sortable: true,
      sortValue: (q) => q.Variety,
      render: (q) => <span className="block max-w-72 whitespace-normal">{q.Variety}</span>,
    },
    {
      key: "warehouse",
      header: t("grossMargin.common.fields.warehouse"),
      sortable: true,
      sortValue: (q) => q.Warehouse,
      render: (q) => q.Warehouse,
    },
    {
      key: "pack",
      header: t("grossMargin.reports.columns.pack"),
      align: "right",
      sortable: true,
      sortValue: (q) => q.PackQuantity,
      render: (q) => <span className="font-mono tabular-nums">{q.PackQuantity ?? "—"}</span>,
    },
    {
      key: "price",
      header: t("grossMargin.reports.columns.price"),
      align: "right",
      sortable: true,
      sortValue: (q) => q.ClientsPrice,
      render: (q) => <span className="font-mono tabular-nums">{formatCurrency(q.ClientsPrice)}</span>,
    },
    {
      key: "margin",
      header: t("grossMargin.reports.columns.margin"),
      align: "right",
      sortable: true,
      sortValue: (q) => q.ClientsMargin,
      render: (q) => <span className="font-mono tabular-nums">{formatPercent(q.ClientsMargin)}</span>,
    },
    { key: "actions", header: "", align: "right", hideMobile: true, render: openButton },
  ];

  const mobileCard = (q: SavedQuoteRow) => (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-foreground break-words">{q.QuoteName}</p>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(q.SavedAt)}</span>
      </div>
      <p className="mt-1 text-sm text-foreground break-words">{q.Variety}</p>
      <p className="text-xs text-muted-foreground">
        {q.Customer} · {q.Warehouse}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("grossMargin.reports.columns.pack")}</dt>
          <dd className="font-mono tabular-nums">{q.PackQuantity ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("grossMargin.reports.columns.price")}</dt>
          <dd className="font-mono tabular-nums">{formatCurrency(q.ClientsPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("grossMargin.reports.columns.margin")}</dt>
          <dd className="font-mono tabular-nums">{formatPercent(q.ClientsMargin)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex justify-end">{openButton(q)}</div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("grossMargin.reports.title")}</CardTitle>
          <CardDescription>{t("grossMargin.reports.description")}</CardDescription>
          {hasActiveFilters && (
            <CardAction>
              <Button variant="ghost" size="sm" className="h-8" onClick={resetFilters}>
                <X aria-hidden="true" />
                {t("grossMargin.reports.reset")}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("grossMargin.reports.quoteName")}>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input placeholder={t("grossMargin.common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
            </Field>
            <Field label={t("grossMargin.common.fields.customer")}>
              <Combobox
                value={customer}
                onChange={(v) => setCustomer(v || ALL)}
                options={[{ value: ALL, label: t("grossMargin.reports.allCustomers") }, ...customers.map((c) => ({ value: c, label: c }))]}
              />
            </Field>
            <Field label={t("grossMargin.common.fields.variety")}>
              <Combobox
                value={variety}
                onChange={(v) => setVariety(v || ALL)}
                options={[{ value: ALL, label: t("grossMargin.reports.allVarieties") }, ...varieties.map((v) => ({ value: v, label: v }))]}
              />
            </Field>
            <Field label={t("grossMargin.common.fields.warehouse")}>
              <Combobox
                value={warehouse}
                onChange={(v) => setWarehouse(v || ALL)}
                options={[{ value: ALL, label: t("grossMargin.common.allWarehouses") }, ...warehouses.map((w) => ({ value: w, label: w }))]}
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {t("grossMargin.reports.loadError")}
            </div>
          )}

          {!error && savedQuotes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("grossMargin.reports.showing", { shown: filtered.length, total: savedQuotes.length })}
            </p>
          )}

          {!error && (
            <DataTable<SavedQuoteRow>
              columns={columns}
              data={filtered}
              rowKey={(q) => String(q.Id)}
              loading={isLoading}
              emptyMessage={savedQuotes.length === 0 ? t("grossMargin.reports.empty") : t("grossMargin.reports.noMatch")}
              mobileCard={mobileCard}
              onRowClick={setSelected}
              pageSize={PAGE_SIZE}
            />
          )}
        </CardContent>
      </Card>

      <SavedQuoteDetails quote={selected} onClose={() => setSelected(null)} onOpen={openInSimulator} />
    </>
  );
}

function SavedQuoteDetails({
  quote,
  onClose,
  onOpen,
}: {
  quote: SavedQuoteRow | null;
  onClose: () => void;
  onOpen: (q: SavedQuoteRow) => void;
}) {
  const { t, i18n } = useTranslation();
  if (!quote) return null;
  const money = (v: number | null) => formatCurrency(v);
  const pct = (v: number | null) => formatPercent(v);
  const rows: { label: string; value: string }[] = [
    { label: t("grossMargin.reports.details.savedBy"), value: quote.CreatedBy ?? "—" },
    { label: t("grossMargin.reports.columns.savedAt"), value: new Date(quote.SavedAt).toLocaleString(i18n.language) },
    { label: t("grossMargin.reports.details.size"), value: quote.Oz !== null ? `${formatNumber(quote.Oz, 2)} oz` : "—" },
    { label: t("grossMargin.reports.columns.pack"), value: quote.PackQuantity !== null ? String(quote.PackQuantity) : "—" },
    { label: t("grossMargin.reports.details.sourcing"), value: quote.Mode ? t(`grossMargin.simulator.modes.${quote.Mode}.plain`) : "—" },
    { label: t("grossMargin.simulator.fields.purchaseCost"), value: money(quote.LbCost) },
    { label: t("grossMargin.simulator.fields.yield"), value: quote.Yield !== null ? formatNumber(quote.Yield, 2) : "—" },
    { label: t("grossMargin.reports.details.baseCost"), value: money(quote.BaseCost) },
    { label: t("grossMargin.reports.details.labour"), value: money(quote.Labor) },
    { label: t("grossMargin.simulator.fields.packing"), value: money(quote.ClamBag) },
    { label: t("grossMargin.simulator.fields.sticker"), value: money(quote.Sticker) },
    { label: t("grossMargin.simulator.fields.box"), value: money(quote.Box) },
    { label: t("grossMargin.simulator.fields.transport"), value: money(quote.Transp) },
    { label: t("grossMargin.simulator.fields.rebate"), value: money(quote.Rebate) },
    { label: t("grossMargin.reports.details.commission"), value: quote.CommPct !== null ? pct(quote.CommPct) : money(quote.Comm) },
    { label: t("grossMargin.reports.columns.price"), value: money(quote.ClientsPrice) },
    { label: t("grossMargin.reports.columns.margin"), value: pct(quote.ClientsMargin) },
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Phone-safe: never wider than the viewport, scrolls inside when taller than it. */}
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
        <DialogHeader className="pr-14">
          <DialogTitle className="break-words">{quote.QuoteName}</DialogTitle>
          <DialogDescription className="break-words">
            {quote.Variety} · {quote.Customer} · {quote.Warehouse}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="text-right font-mono tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex shrink-0 justify-end border-t border-border px-6 py-3">
          <Button onClick={() => onOpen(quote)}>
            <ExternalLink aria-hidden="true" />
            {t("grossMargin.reports.open")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
