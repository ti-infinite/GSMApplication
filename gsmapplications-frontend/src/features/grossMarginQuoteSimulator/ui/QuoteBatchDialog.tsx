import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Users, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";
import { Combobox } from "@/shared/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { DataTable, type TableColumn } from "@/shared/ui/data-table";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { decimalInputProps, parseDecimal } from "@/shared/lib/formValidation";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import { savedQuotesApi, useInvalidateSavedQuotes } from "@/entities/grossMarginSavedQuote";
import { getCurrentFieldValue, recomputeSalesRow, type QuoteOverrides } from "../model/recompute";
import { buildRecomputeInputsForRow, findTransportCostForRow } from "../model/quoteScenarioReferences";
import { getCostFields, type QuoteFieldMeta } from "../model/quoteFields";
import { buildSavedQuoteBody } from "../model/savedQuotes";
import type { QuoteScenarioExportEntry } from "../model/quoteScenarioExport";

// One quote, several customers. The quote on screen (its product, warehouse,
// pack and every change made so far) is the base; each customer added here
// gets a row where the things that differ between customers -- transport,
// rebate, commission, list price -- start from that customer's own reference
// data and can be adjusted. Any other field can still be changed for one
// customer under "More". Saving writes one saved quote per customer, named
// "<name> · <customer>", so they show up in Reports as separate rows.

type PerCustomer = Record<string, QuoteOverrides>;

interface CustomerLine {
  customer: string;
}

// Two decimals everywhere in this dialog: it is a comparison table, not an
// entry form for thousandths.
const money2 = (v: number | null) => (v === null ? "—" : `$${formatNumber(v, 2)}`);
const round2 = (v: number) => Math.round(v * 100) / 100;

const PRICE_KEY = "avgUnitPriceBaseOverride";
const TRANSPORT_KEY = "transportOverride";
const REBATE_KEY = "rebateOverride";

export function QuoteBatchDialog({
  baseline,
  overrides,
  packQuantity,
  rows,
  commissions,
  rebates,
  transportCosts,
  onClose,
}: {
  baseline: SalesRow;
  overrides: QuoteOverrides;
  packQuantity: number;
  rows: SalesRow[];
  commissions: CommissionRow[];
  rebates: RebateRow[];
  transportCosts: TransportCostRow[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const invalidateSavedQuotes = useInvalidateSavedQuotes();
  const [name, setName] = useState("");
  const [customers, setCustomers] = useState<string[]>([baseline.Customer]);
  const [perCustomer, setPerCustomer] = useState<PerCustomer>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // `${customer}|${key}` -> text being typed
  const [picker, setPicker] = useState("");
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allCustomers = useMemo(() => Array.from(new Set(rows.map((r) => r.Customer))).sort(), [rows]);
  const customerOptions = useMemo(
    () => allCustomers.filter((c) => !customers.includes(c)).map((c) => ({ value: c, label: c })),
    [allCustomers, customers]
  );

  // Everything derived per customer, recomputed when anything changes.
  const lines = useMemo(() => {
    return customers.map((customer) => {
      const row: SalesRow = { ...baseline, Customer: customer };
      const inputs = buildRecomputeInputsForRow(row, commissions, rebates, transportCosts);
      const own = perCustomer[customer] ?? {};
      // Transport starts from the customer's own reference when it has one;
      // the base quote's transport would otherwise carry over silently.
      const transportRef = findTransportCostForRow(transportCosts, row);
      const defaults: QuoteOverrides = {};
      if (customer !== baseline.Customer && transportRef?.TransportUnitCost != null && own[TRANSPORT_KEY] === undefined && overrides[TRANSPORT_KEY] === undefined) {
        defaults[TRANSPORT_KEY] = transportRef.TransportUnitCost;
      }
      const effective: QuoteOverrides = { ...overrides, ...defaults, ...own };
      const result = recomputeSalesRow(inputs, effective);
      const commissionType = inputs.commission?.CommissionType ?? null;
      return { customer, row, inputs, effective, result, commissionType };
    });
  }, [customers, baseline, commissions, rebates, transportCosts, overrides, perCustomer]);

  const mode = lines[0]?.result.mode ?? "none";
  const costFields = useMemo(() => getCostFields(mode, (key) => t(`grossMargin.simulator.fields.${key}`)), [mode, t]);

  function addCustomer(c: string) {
    const trimmed = c.trim();
    if (!trimmed || customers.includes(trimmed)) return;
    setCustomers((prev) => [...prev, trimmed]);
  }
  function removeCustomer(c: string) {
    setCustomers((prev) => prev.filter((x) => x !== c));
    setPerCustomer((prev) => {
      const next = { ...prev };
      delete next[c];
      return next;
    });
    if (expanded === c) setExpanded(null);
  }

  function setValue(customer: string, key: string, text: string, isPercent: boolean) {
    setDrafts((d) => ({ ...d, [`${customer}|${key}`]: text }));
    const parsed = text.trim() === "" ? null : parseDecimal(text);
    if (typeof parsed === "symbol") return; // not a number yet; keep typing
    setPerCustomer((prev) => {
      const own: QuoteOverrides = { ...(prev[customer] ?? {}) };
      if (parsed === null) delete (own as Record<string, unknown>)[key];
      else (own as Record<string, unknown>)[key] = isPercent ? parsed / 100 : parsed;
      return { ...prev, [customer]: own };
    });
  }

  function cell(line: (typeof lines)[number], key: string, format: "currency" | "percent" | "number", step: string) {
    const draftKey = `${line.customer}|${key}`;
    const own = (line.effective as Record<string, number | undefined>)[key];
    const isPercent = format === "percent";
    const current = getCurrentFieldValue(key, line.inputs, line.effective, line.result.avgUnitPriceBase);
    const placeholder = current === null ? "—" : isPercent ? formatPercent(current) : format === "currency" ? money2(current) : String(round2(current));
    const text = drafts[draftKey] ?? (own === undefined ? "" : String(isPercent ? Math.round(own * 1000) / 10 : round2(own)));
    const differs = (line.customer in perCustomer) && (perCustomer[line.customer] as Record<string, unknown>)[key] !== undefined;
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Input
          {...decimalInputProps}
          step={step}
          value={text}
          onChange={(e) => setValue(line.customer, key, e.target.value, isPercent)}
          placeholder={placeholder}
          className={cn("h-8 w-28 text-right font-mono text-xs tabular-nums", isPercent && "pr-6", differs && "border-primary/60")}
          aria-label={key}
        />
        {isPercent && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">%</span>}
      </div>
    );
  }

  const columns: TableColumn<CustomerLine>[] = [
    {
      key: "customer",
      header: t("grossMargin.common.fields.customer"),
      render: (l) => (
        <div className="flex items-center gap-2">
          <span className={cn("max-w-48 truncate font-medium", l.customer === baseline.Customer && "text-primary")} title={l.customer}>
            {l.customer}
          </span>
          {customers.length > 1 && (
            <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeCustomer(l.customer)} aria-label={t("grossMargin.simulator.batch.remove")}>
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
    {
      key: "transport",
      header: t("grossMargin.simulator.fields.transport"),
      align: "right",
      render: (l) => cell(lines.find((x) => x.customer === l.customer)!, TRANSPORT_KEY, "currency", "0.001"),
    },
    {
      key: "rebate",
      header: t("grossMargin.simulator.fields.rebate"),
      align: "right",
      render: (l) => cell(lines.find((x) => x.customer === l.customer)!, REBATE_KEY, "currency", "0.001"),
    },
    {
      key: "commission",
      header: t("grossMargin.simulator.batch.commission"),
      align: "right",
      render: (l) => {
        const line = lines.find((x) => x.customer === l.customer)!;
        return line.commissionType === "value"
          ? cell(line, "commissionValueOverride", "currency", "0.001")
          : cell(line, "commissionPercentOverride", "percent", "0.1");
      },
    },
    {
      key: "price",
      header: t("grossMargin.simulator.batch.listPrice"),
      align: "right",
      render: (l) => cell(lines.find((x) => x.customer === l.customer)!, PRICE_KEY, "currency", "0.001"),
    },
    {
      key: "final",
      header: t("grossMargin.simulator.batch.finalPrice", { packQty: packQuantity }),
      align: "right",
      render: (l) => {
        const line = lines.find((x) => x.customer === l.customer)!;
        const price = line.result.row.AvgUnitPrice;
        return <span className="font-mono font-semibold tabular-nums">{price === null ? "—" : money2(price * packQuantity)}</span>;
      },
    },
    {
      key: "margin",
      header: t("grossMargin.simulator.batch.margin"),
      align: "right",
      render: (l) => {
        const gm = lines.find((x) => x.customer === l.customer)!.result.row.GrossMargin;
        return <span className={cn("font-mono tabular-nums", gm !== null && gm < 0 && "text-destructive")}>{formatPercent(gm)}</span>;
      },
    },
    {
      key: "more",
      header: "",
      align: "right",
      hideMobile: true,
      render: (l) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => (x === l.customer ? null : l.customer));
          }}
        >
          {t("grossMargin.simulator.batch.more")}
          {expanded === l.customer ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
        </Button>
      ),
    },
  ];

  const renderExpanded = (l: CustomerLine) => {
    if (expanded !== l.customer) return null;
    const line = lines.find((x) => x.customer === l.customer)!;
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 text-xs text-muted-foreground">{t("grossMargin.simulator.batch.moreHint", { customer: l.customer })}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {costFields.map((f: QuoteFieldMeta) => (
            <Field key={f.key} label={f.label}>
              {cell(line, f.key, f.format, f.step)}
            </Field>
          ))}
        </div>
      </div>
    );
  };

  async function handleSave() {
    const base = name.trim();
    if (!base) {
      toast.error(t("grossMargin.simulator.scenarios.nameFirst"));
      return;
    }
    if (lines.length === 0) return;
    setSaving(true);
    const savedAt = new Date().toISOString();
    let ok = 0;
    const failed: string[] = [];
    for (const line of lines) {
      const entry: QuoteScenarioExportEntry = {
        name: `${base} · ${line.customer}`,
        savedAt,
        mode: line.result.mode,
        packQuantity,
        inputs: line.inputs,
        overrides: line.effective,
        row: line.result.row,
        avgUnitPriceBase: line.result.avgUnitPriceBase,
        commissionType: line.commissionType,
      };
      try {
        await savedQuotesApi.create(buildSavedQuoteBody(entry, line.row));
        ok++;
      } catch {
        failed.push(line.customer);
      }
    }
    setSaving(false);
    if (ok > 0) {
      toast.success(t("grossMargin.simulator.batch.saved", { count: ok, name: base }));
      invalidateSavedQuotes();
    }
    if (failed.length > 0) toast.error(t("grossMargin.simulator.batch.failed", { customers: failed.join(", ") }));
    if (failed.length === 0) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] max-w-6xl flex-col"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.("[data-combobox-dropdown]")) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.("[data-combobox-dropdown]")) e.preventDefault();
        }}
      >
        <DialogHeader className="pr-14">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" aria-hidden="true" />
            <DialogTitle>{t("grossMargin.simulator.batch.title")}</DialogTitle>
          </div>
          <DialogDescription>
            {baseline.Variety} · {baseline.Warehouse} · {t("grossMargin.simulator.batch.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Field label={t("grossMargin.simulator.batch.name")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("grossMargin.simulator.scenarios.namePlaceholder")} />
            </Field>
            <Field label={t("grossMargin.simulator.batch.addExisting")}>
              <Combobox
                value={picker}
                onChange={(v) => {
                  if (v) addCustomer(v);
                  setPicker("");
                }}
                options={customerOptions}
                placeholder={t("grossMargin.common.selectCustomer")}
              />
            </Field>
            <Field label={t("grossMargin.simulator.batch.addNew")}>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("grossMargin.simulator.batch.addNewPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomer(newName);
                      setNewName("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    addCustomer(newName);
                    setNewName("");
                  }}
                  disabled={!newName.trim()}
                  aria-label={t("grossMargin.simulator.batch.add")}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </Field>
          </div>

          <DataTable<CustomerLine>
            columns={columns}
            data={lines.map((l) => ({ customer: l.customer }))}
            rowKey={(l) => l.customer}
            emptyMessage={t("grossMargin.simulator.batch.empty")}
            renderExpanded={renderExpanded}
          />
          <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.batch.hint")}</p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-3">
          <p className="text-sm text-muted-foreground">{t("grossMargin.simulator.batch.count", { count: lines.length })}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {t("grossMargin.common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || lines.length === 0 || !name.trim()}>
              {saving ? t("grossMargin.common.saving") : t("grossMargin.simulator.batch.saveAll", { count: lines.length })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
