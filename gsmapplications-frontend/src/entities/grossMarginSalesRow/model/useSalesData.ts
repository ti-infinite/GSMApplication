import { useQuery } from "@tanstack/react-query";
import { fetchSalesRows } from "../api/fetchSales";

// db_ai.Sales only changes when the pipeline reruns (an Updates-tab write,
// or the relay's own 5-min autorebuild timer), so this polls at that
// cadence plus a refetch on window focus. `refresh` stays for Updates-tab
// writes, which know the data just changed.
const RELAY_REBUILD_INTERVAL_MS = 5 * 60 * 1000;

export function useSalesData() {
  const query = useQuery({
    queryKey: ["sales-row", "list"],
    queryFn: fetchSalesRows,
    // Matches the relay's own rebuild cadence -- navigating back to any
    // Gross Margin page within that window reuses the cached rows instead
    // of re-requesting data that can't have changed yet.
    staleTime: RELAY_REBUILD_INTERVAL_MS,
    refetchInterval: RELAY_REBUILD_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    lastFetched: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    refresh: () => {
      query.refetch();
    },
  };
}
