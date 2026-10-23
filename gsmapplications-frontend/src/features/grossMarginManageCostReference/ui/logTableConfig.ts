import type { TFunction } from "i18next";
import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
import type { CostReferenceRow } from "@/entities/grossMarginCostReference";

const COST_KEYS = ["packing", "sticker", "box", "labourProd", "labourRepack", "labourAssembler"] as const;

function getFieldValue(row: CostReferenceRow, key: string): number | null {
  switch (key) {
    case "packing":
      return row.Packing;
    case "sticker":
      return row.Sticker;
    case "box":
      return row.Box;
    case "labourProd":
      return row.LabourProd;
    case "labourRepack":
      return row.LabourRepack;
    case "labourAssembler":
      return row.LabourAssembler;
    default:
      return null;
  }
}

export function createCostReferenceLogTableConfig(t: TFunction): ReferenceLogTableConfig<CostReferenceRow> {
  return {
    title: t("grossMargin.updates.costReference.log.title"),
    description: t("grossMargin.updates.costReference.log.description"),
    identityColumns: [
      { label: t("grossMargin.common.fields.variety"), render: (row) => row.Variety },
      { label: t("grossMargin.common.fields.warehouse"), render: (row) => row.Warehouse },
    ],
    editableFields: COST_KEYS.map((key) => ({
      key,
      label: t(`grossMargin.common.fields.${key}`),
      rules: getFieldRules("cost-reference", key),
    })),
    getFieldValue,
    rowId: (row) => row.Id,
    deleteWarning: (row) =>
      t("grossMargin.updates.costReference.log.deleteWarning", { variety: row.Variety, warehouse: row.Warehouse }),
    emptyMessage: t("grossMargin.updates.costReference.log.empty"),
    getSearchText: (row) => `${row.Variety} ${row.Warehouse}`,
    searchPlaceholder: t("grossMargin.updates.costReference.log.searchPlaceholder"),
  };
}
