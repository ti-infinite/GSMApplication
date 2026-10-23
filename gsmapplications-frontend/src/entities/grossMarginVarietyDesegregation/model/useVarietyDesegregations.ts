import { useQuery } from "@tanstack/react-query";
import { grossMarginRefQueryKey } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { varietyDesegregationApi } from "../api/varietyDesegregation";

const STALE_TIME_MS = 5 * 60 * 1000;

export function useVarietyDesegregations() {
  const query = useQuery({
    queryKey: grossMarginRefQueryKey("variety-desegregation"),
    queryFn: varietyDesegregationApi.list,
    staleTime: STALE_TIME_MS,
    // See useCommissions.ts for why this is false.
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });

  return {
    varietyDesegregations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
