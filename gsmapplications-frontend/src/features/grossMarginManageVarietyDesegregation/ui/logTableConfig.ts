import type { TFunction } from "i18next";
import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
import type { VarietyDesegregationRow } from "@/entities/grossMarginVarietyDesegregation";

function getFieldValue(row: VarietyDesegregationRow, key: string): number | null {
  if (key === "quantity") return row.Quantity;
  if (key === "factor") return row.Factor;
  return null;
}

export function createVarietyDesegregationLogTableConfig(t: TFunction): ReferenceLogTableConfig<VarietyDesegregationRow> {
  return {
    title: t("grossMargin.updates.mixedHerbs.log.title"),
    description: t("grossMargin.updates.mixedHerbs.log.description"),
    identityColumns: [
      { label: t("grossMargin.updates.mixedHerbs.blend"), render: (row) => row.ParentVariety },
      { label: t("grossMargin.updates.mixedHerbs.component"), render: (row) => row.ChildVariety },
    ],
    editableFields: [
      { key: "quantity", label: t("grossMargin.common.fields.quantity"), rules: getFieldRules("variety-desegregation", "quantity") },
      { key: "factor", label: t("grossMargin.common.fields.factor"), rules: getFieldRules("variety-desegregation", "factor") },
    ],
    getFieldValue,
    rowId: (row) => row.Id,
    deleteWarning: (row) =>
      t("grossMargin.updates.mixedHerbs.log.deleteWarning", { child: row.ChildVariety, parent: row.ParentVariety }),
    emptyMessage: t("grossMargin.updates.mixedHerbs.log.empty"),
    getSearchText: (row) => `${row.ParentVariety} ${row.ChildVariety}`,
    searchPlaceholder: t("grossMargin.updates.mixedHerbs.log.searchPlaceholder"),
  };
}
