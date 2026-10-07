import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { formatNumber } from "@/shared/lib/format";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";

function getFieldValue(row: TransportCostRow, key: string): number | null {
  switch (key) {
    case "qty":
      return row.Qty;
    case "boxesXPallet":
      return row.BoxesXPallet;
    case "palletCost":
      return row.PalletCost;
    default:
      return null;
  }
}

export const transportCostLogTableConfig: ReferenceLogTableConfig<TransportCostRow> = {
  title: "Transport Cost log",
  description: "Every per-customer, per-package-size transport cost currently applied.",
  identityColumns: [
    { label: "Customer", render: (row) => row.DivisionName },
    { label: "Warehouse", render: (row) => row.Warehouse ?? "Any" },
    { label: "Type", render: (row) => row.Type ?? "—" },
    { label: "Packaging", render: (row) => row.Packaging ?? "—" },
    { label: "Size", render: (row) => formatNumber(row.MeasurementUnitValue, 2) },
    { label: "Pack size", render: (row) => (row.PackQty !== null ? String(row.PackQty) : "Any") },
    {
      label: "Transport $/unit",
      render: (row) => (row.TransportUnitCost !== null ? formatNumber(row.TransportUnitCost, 4) : "—"),
    },
  ],
  editableFields: [
    { key: "qty", label: "Qty", step: "1" },
    { key: "boxesXPallet", label: "Boxes/Pallet", step: "1" },
    { key: "palletCost", label: "Pallet Cost", step: "0.01" },
  ],
  getFieldValue,
  rowId: (row) => row.Id,
  deleteWarning: (row) =>
    `This changes the transport cost for every variety sold to ${row.DivisionName}` +
    `${row.Warehouse ? ` from ${row.Warehouse}` : " from any warehouse"} at the ` +
    `${row.MeasurementUnitValue} package size` +
    `${row.PackQty ? ` (${row.PackQty}-pack)` : ""} — not just one row.`,
  emptyMessage: "No transport costs applied yet.",
  getSearchText: (row) => row.DivisionName,
  searchPlaceholder: "Search customer…",
};
