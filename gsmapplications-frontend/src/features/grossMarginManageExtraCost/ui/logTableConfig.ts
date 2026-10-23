import type { TFunction } from "i18next";
import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
import { formatNumber } from "@/shared/lib/format";
import type { ExtraCostRow } from "@/entities/grossMarginExtraCost";

const WAREHOUSE_KEYS = ["mia", "bos", "chi", "vin"] as const;

function getFieldValue(row: ExtraCostRow, key: string): number | null {
  switch (key) {
    case "mia":
      return row.MIA;
    case "bos":
      return row.BOS;
    case "chi":
      return row.CHI;
    case "vin":
      return row.VIN;
    default:
      return null;
  }
}

export function createExtraCostLogTableConfig(t: TFunction): ReferenceLogTableConfig<ExtraCostRow> {
  return {
    title: t("grossMargin.updates.extraCost.log.title"),
    description: t("grossMargin.updates.extraCost.log.description"),
    identityColumns: [
      { label: t("grossMargin.common.fields.supplier"), render: (row) => row.Supplier },
      { label: t("grossMargin.common.fields.sku"), render: (row) => row.SKUCalculated },
      { label: t("grossMargin.updates.extraCost.log.size"), render: (row) => formatNumber(row.MeasureUnit, 2) },
    ],
    editableFields: WAREHOUSE_KEYS.map((key) => ({
      key,
      label: key.toUpperCase(),
      rules: getFieldRules("extra-cost", key),
    })),
    getFieldValue,
    rowId: (row) => row.Id,
    deleteWarning: (row) =>
      t("grossMargin.updates.extraCost.log.deleteWarning", {
        supplier: row.Supplier,
        sku: row.SKUCalculated,
        size: row.MeasureUnit,
      }),
    emptyMessage: t("grossMargin.updates.extraCost.log.empty"),
    getSearchText: (row) => `${row.Supplier} ${row.SKUCalculated}`,
    searchPlaceholder: t("grossMargin.updates.extraCost.log.searchPlaceholder"),
  };
}
