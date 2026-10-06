import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import type { CostReferenceRow } from "@/entities/gross-margin-cost-reference";

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

export const costReferenceLogTableConfig: ReferenceLogTableConfig<CostReferenceRow> = {
  title: "Cost Reference log",
  description: "Every variety+warehouse's Packing/Sticker/Box/Labour costs currently applied.",
  identityColumns: [
    { label: "Variety", render: (row) => row.Variety },
    { label: "Warehouse", render: (row) => row.Warehouse },
  ],
  editableFields: [
    { key: "packing", label: "Packing" },
    { key: "sticker", label: "Sticker" },
    { key: "box", label: "Box" },
    { key: "labourProd", label: "Labour (Prod)" },
    { key: "labourRepack", label: "Labour (Repack)" },
    { key: "labourAssembler", label: "Labour (Assembler)" },
  ],
  getFieldValue,
  rowId: (row) => row.Id,
  deleteWarning: (row) =>
    `This changes Packing/Sticker/Box/Labour costs for every customer buying ${row.Variety} ` +
    `from ${row.Warehouse} — not just one row.`,
  emptyMessage: "No cost references applied yet.",
  getSearchText: (row) => `${row.Variety} ${row.Warehouse}`,
  searchPlaceholder: "Search variety or warehouse…",
};
