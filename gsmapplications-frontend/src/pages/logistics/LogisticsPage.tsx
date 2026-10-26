import { useTranslation } from "react-i18next";
import { LogisticsTable } from "@/widgets/LogisticsTable";

// Logistics: upcoming shipments with their pallet count and carrier options,
// the confirmed carrier in green, an alarm when the ship date is near with
// nothing confirmed, and the invoice lines from IH Sales. Data comes from
// db_srv.IHLogistics through the relay (see entities/logistics).
export default function LogisticsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl text-foreground">{t("logistics.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("logistics.subtitle")}</p>
      </div>
      <LogisticsTable />
    </div>
  );
}
