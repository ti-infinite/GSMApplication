import { useTranslation } from "react-i18next";
import { useSalesData } from "@/entities/grossMarginSalesRow";
import { Skeleton } from "@/shared/ui/skeleton";
import { QuoteSimulatorTab } from "@/features/grossMarginQuoteSimulator";

export default function QuoteSimulatorPage() {
  const { t } = useTranslation();
  const { rows, isLoading, error, lastFetched } = useSalesData();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-xl font-bold sm:text-2xl text-foreground">{t("grossMargin.pages.simulatorTitle")}</h1>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("grossMargin.common.loadError")}
        </div>
      )}

      {isLoading && rows.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <QuoteSimulatorTab rows={rows} refreshKey={lastFetched?.getTime()} />
      )}
    </div>
  );
}
