import type { TFunction } from "i18next";
import type { ReferenceLogTableConfig } from "@/shared/ui/reference-log-table";
import { getFieldRules } from "@/shared/lib/referenceSchemas";
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

export function createTransportCostLogTableConfig(t: TFunction): ReferenceLogTableConfig<TransportCostRow> {
  const f = (key: string) => t(`grossMargin.common.fields.${key}`);
  return {
    title: t("grossMargin.updates.transportCost.log.title"),
    description: t("grossMargin.updates.transportCost.log.description"),
    identityColumns: [
      { label: f("customer"), render: (row) => row.DivisionName },
      { label: f("warehouse"), render: (row) => row.Warehouse ?? t("grossMargin.common.any") },
      { label: f("type"), render: (row) => row.Type ?? "—" },
      { label: f("packaging"), render: (row) => row.Packaging ?? "—" },
      { label: t("grossMargin.updates.transportCost.log.size"), render: (row) => formatNumber(row.MeasurementUnitValue, 2) },
      { label: f("packSize"), render: (row) => (row.PackQty !== null ? String(row.PackQty) : t("grossMargin.common.any")) },
      {
        label: t("grossMargin.updates.transportCost.log.transportPerUnit"),
        render: (row) => (row.TransportUnitCost !== null ? formatNumber(row.TransportUnitCost, 4) : "—"),
      },
    ],
    editableFields: [
      { key: "qty", label: f("qty"), rules: getFieldRules("transport-cost", "qty") },
      { key: "boxesXPallet", label: f("boxesPerPallet"), rules: getFieldRules("transport-cost", "boxesXPallet") },
      { key: "palletCost", label: f("palletCost"), rules: getFieldRules("transport-cost", "palletCost") },
    ],
    getFieldValue,
    rowId: (row) => row.Id,
    deleteWarning: (row) =>
      t("grossMargin.updates.transportCost.log.deleteWarning", {
        customer: row.DivisionName,
        warehouse: row.Warehouse ?? t("grossMargin.common.anyWarehouse"),
        size: row.MeasurementUnitValue,
        pack: row.PackQty ? t("grossMargin.updates.transportCost.log.packSuffix", { count: row.PackQty }) : "",
      }),
    emptyMessage: t("grossMargin.updates.transportCost.log.empty"),
    getSearchText: (row) => row.DivisionName,
    searchPlaceholder: t("grossMargin.updates.transportCost.log.searchPlaceholder"),
  };
}
