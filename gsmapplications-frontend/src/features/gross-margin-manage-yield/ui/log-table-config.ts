import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import type { YieldRow } from "@/entities/gross-margin-yield";

function getFieldValue(row: YieldRow, key: string): number | null {
  return key === "yieldValue" ? row.Yield : null;
}

export const yieldsLogTableConfig: ReferenceLogTableConfig<YieldRow> = {
  title: "Yields log",
  description: "Every SKU's pound-to-unit conversion factor currently applied.",
  identityColumns: [{ label: "SKU", render: (row) => row.CalculatedSKU }],
  editableFields: [{ key: "yieldValue", label: "Yield", step: "0.01" }],
  getFieldValue,
  rowId: (row) => row.Id,
  deleteWarning: (row) =>
    `This changes FinalPurPrice and FinalUnitCost for every customer and warehouse selling ` +
    `SKU ${row.CalculatedSKU} — not just one row.`,
  emptyMessage: "No yields applied yet.",
  getSearchText: (row) => row.CalculatedSKU,
  searchPlaceholder: "Search SKU…",
};
