import { useTranslation } from "react-i18next";
import { SavedQuotesTable } from "@/widgets/GrossMarginSavedQuotesTable";


export default function ReportsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-xl font-bold sm:text-2xl text-foreground">{t("grossMargin.pages.reportsTitle")}</h1>
      <SavedQuotesTable />
    </div>
  );
}
