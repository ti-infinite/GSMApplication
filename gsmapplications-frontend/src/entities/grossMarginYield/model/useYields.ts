import { useQuery } from "@tanstack/react-query";
import { grossMarginRefQueryKey } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { yieldsApi } from "../api/yields";

const STALE_TIME_MS = 5 * 60 * 1000;

export function useYields() {
  const query = useQuery({
    queryKey: grossMarginRefQueryKey("yields"),
    queryFn: yieldsApi.list,
    staleTime: STALE_TIME_MS,
    // See useCommissions.ts for why this is false.
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });

  return {
    yields: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
