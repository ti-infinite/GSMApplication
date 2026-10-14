import { useQuery } from "@tanstack/react-query";
import { grossMarginRefQueryKey } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { extraCostApi } from "../api/extraCost";

const STALE_TIME_MS = 5 * 60 * 1000;

export function useExtraCosts() {
  const query = useQuery({
    queryKey: grossMarginRefQueryKey("extra-cost"),
    queryFn: extraCostApi.list,
    staleTime: STALE_TIME_MS,
    // See useCommissions.ts for why this is false.
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });

  return {
    extraCosts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
