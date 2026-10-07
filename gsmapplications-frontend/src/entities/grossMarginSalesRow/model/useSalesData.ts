import { useQuery } from "@tanstack/react-query";
import { fetchSalesRows } from "../api/fetchSales";

// db_ai.Sales only changes when the pipeline reruns (an Updates-tab write,
// or the relay's own 5-min autorebuild timer). The pages used to expose a
// manual "Refresh data" button; it was removed (2026-10-06) in favour of
// polling at the relay's own cadence plus a refetch on window focus, so new
// data shows up without the user having to ask for it. `refresh` stays for
// Updates-tab writes, which know the data just changed.
const RELAY_REBUILD_INTERVAL_MS = 5 * 60 * 1000;

export function useSalesData() {
  const query = useQuery({
    queryKey: ["sales-row", "list"],
    queryFn: fetchSalesRows,
    staleTime: 0,
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
