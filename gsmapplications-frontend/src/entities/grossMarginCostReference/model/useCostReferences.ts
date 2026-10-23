import { useQuery } from "@tanstack/react-query";
import { grossMarginRefQueryKey } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { costReferenceApi } from "../api/costReference";

const STALE_TIME_MS = 5 * 60 * 1000;

export function useCostReferences() {
  const query = useQuery({
    queryKey: grossMarginRefQueryKey("cost-reference"),
    queryFn: costReferenceApi.list,
    staleTime: STALE_TIME_MS,
    // See useCommissions.ts for why this is false.
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });

  return {
    costReferences: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
