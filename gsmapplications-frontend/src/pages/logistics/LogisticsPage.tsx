import { useTranslation } from "react-i18next";
import { LogisticsTable } from "@/widgets/LogisticsTable";

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
