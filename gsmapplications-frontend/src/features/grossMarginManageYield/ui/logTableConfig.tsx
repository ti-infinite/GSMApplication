import type { TFunction } from "i18next";
import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
import type { YieldRow } from "@/entities/grossMarginYield";

function getFieldValue(row: YieldRow, key: string): number | null {
  return key === "yieldValue" ? row.Yield : null;
}

/**
 * Yields are keyed by product code (CalculatedSKU) in the database, but
 * people think in variety names, so the log shows the variety name(s) the
 * code maps to in the current sales data, with the code as secondary text.
 * `varietiesBySku` comes from the sales rows already loaded on the page.
 */
export function createYieldsLogTableConfig(
  t: TFunction,
  varietiesBySku: Map<string, string[]>
): ReferenceLogTableConfig<YieldRow> {
  // One yield covers every size of the same herb, so show the herb name:
  // the part all its variety names share (e.g. "BASIL"), never a list.
  const varietyLabel = (sku: string) => {
    const names = varietiesBySku.get(sku) ?? [];
    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    const upper = names.map((n) => n.toUpperCase());
    let prefix = upper[0];
    for (const n of upper.slice(1)) {
      let i = 0;
      while (i < prefix.length && i < n.length && prefix[i] === n[i]) i++;
      prefix = prefix.slice(0, i);
    }
    // Cut back to a whole word and drop a dangling separator.
    const cut = prefix.replace(/[\s\-/,.]+$/, "");
    const wordBoundary = /^(.*\S)(?:\s|$)/.exec(cut)?.[1] ?? "";
    const herb = prefix.length === cut.length || cut === "" ? wordBoundary || cut : cut;
    const cleaned = (herb.includes(" ") && !prefix.endsWith(" ") && prefix.length === cut.length ? herb.replace(/\s\S*$/, "") : herb).trim();
    return cleaned || upper[0].split(/\s|-/)[0];
  };
  return {
    title: t("grossMargin.updates.yields.log.title"),
    description: t("grossMargin.updates.yields.log.description"),
    identityColumns: [
      {
        label: t("grossMargin.common.fields.variety"),
        render: (row) => {
          const name = varietyLabel(row.CalculatedSKU);
          return name ? (
            <span className="block">
              <span className="block">{name}</span>
              <span className="block font-mono text-xs text-muted-foreground">{row.CalculatedSKU}</span>
            </span>
          ) : (
            <span className="font-mono">{row.CalculatedSKU}</span>
          );
        },
      },
    ],
    editableFields: [{ key: "yieldValue", label: t("grossMargin.common.fields.yield"), rules: getFieldRules("yields", "yieldValue") }],
    getFieldValue,
    rowId: (row) => row.Id,
    deleteWarning: (row) =>
      t("grossMargin.updates.yields.log.deleteWarning", { product: varietyLabel(row.CalculatedSKU) ?? row.CalculatedSKU }),
    emptyMessage: t("grossMargin.updates.yields.log.empty"),
    getSearchText: (row) => `${varietyLabel(row.CalculatedSKU) ?? ""} ${row.CalculatedSKU}`,
    searchPlaceholder: t("grossMargin.updates.yields.log.searchPlaceholder"),
  };
}
