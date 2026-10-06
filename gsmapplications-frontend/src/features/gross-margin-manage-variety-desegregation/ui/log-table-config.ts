import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import type { VarietyDesegregationRow } from "@/entities/gross-margin-variety-desegregation";

function getFieldValue(row: VarietyDesegregationRow, key: string): number | null {
  if (key === "quantity") return row.Quantity;
  if (key === "factor") return row.Factor;
  return null;
}

export const varietyDesegregationLogTableConfig: ReferenceLogTableConfig<VarietyDesegregationRow> = {
  title: "Mixed Herb Composition log",
  description: "Every single-herb component currently feeding a mixed-herb blend's Purchase Cost.",
  identityColumns: [
    { label: "Blend (Parent)", render: (row) => row.ParentVariety },
    { label: "Component (Child)", render: (row) => row.ChildVariety },
  ],
  editableFields: [
    { key: "quantity", label: "Quantity", step: "1" },
    { key: "factor", label: "Factor", step: "0.000001" },
  ],
  getFieldValue,
  rowId: (row) => row.Id,
  deleteWarning: (row) =>
    `This removes ${row.ChildVariety} from ${row.ParentVariety}'s cost calculation — ` +
    `the blend's Purchase Cost will be recalculated without it.`,
  emptyMessage: "No mixed-herb components yet.",
  getSearchText: (row) => `${row.ParentVariety} ${row.ChildVariety}`,
  searchPlaceholder: "Search blend or component…",
};
