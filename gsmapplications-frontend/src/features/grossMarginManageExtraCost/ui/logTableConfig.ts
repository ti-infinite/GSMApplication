import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { formatNumber } from "@/shared/lib/format";
import type { ExtraCostRow } from "@/entities/grossMarginExtraCost";

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

export const extraCostLogTableConfig: ReferenceLogTableConfig<ExtraCostRow> = {
  title: "Supplier Extra Cost log",
  description: "Every per-supplier, per-SKU landed cost adjustment currently applied.",
  identityColumns: [
    { label: "Supplier", render: (row) => row.Supplier },
    { label: "SKU", render: (row) => row.SKUCalculated },
    { label: "Size", render: (row) => formatNumber(row.MeasureUnit, 2) },
  ],
  editableFields: [
    { key: "mia", label: "MIA", step: "0.0001" },
    { key: "bos", label: "BOS", step: "0.0001" },
    { key: "chi", label: "CHI", step: "0.0001" },
    { key: "vin", label: "VIN", step: "0.0001" },
  ],
  getFieldValue,
  rowId: (row) => row.Id,
  deleteWarning: (row) =>
    `This changes the landed cost for every purchase of ${row.Supplier} × ${row.SKUCalculated} ` +
    `at the ${row.MeasureUnit} size, across all warehouses — affecting every customer who buys ` +
    `that SKU, not just one row.`,
  emptyMessage: "No extra costs applied yet.",
  getSearchText: (row) => `${row.Supplier} ${row.SKUCalculated}`,
  searchPlaceholder: "Search supplier or SKU…",
};
