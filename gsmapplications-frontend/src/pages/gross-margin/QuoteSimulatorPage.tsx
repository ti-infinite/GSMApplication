import { useSalesData } from "@/entities/gross-margin-sales-row";
import { Skeleton } from "@/shared/ui/skeleton";
import { QuoteSimulatorTab } from "@/features/gross-margin-quote-simulator";

export default function QuoteSimulatorPage() {
  const { rows, loading, error, lastFetched } = useSalesData();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl text-foreground">Quote Simulator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Infinite Herbs — live from db_ai.Sales
            {lastFetched && ` · updated ${lastFetched.toLocaleTimeString()}`}
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn&apos;t load data from db_ai.Sales: {error}. It retries automatically, or check back shortly.
        </div>
      )}

      {loading && rows.length === 0 ? (
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
