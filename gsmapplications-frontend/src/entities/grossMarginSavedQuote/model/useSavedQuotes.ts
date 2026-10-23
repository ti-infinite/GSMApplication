import { useQuery, useQueryClient } from "@tanstack/react-query";
import { savedQuotesApi } from "../api/savedQuotes";

export const SAVED_QUOTES_QUERY_KEY = ["gross-margin-saved-quotes"] as const;

const STALE_TIME_MS = 60 * 1000;

export function useSavedQuotes() {
  const query = useQuery({
    queryKey: SAVED_QUOTES_QUERY_KEY,
    queryFn: savedQuotesApi.list,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  return {
    savedQuotes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: query.refetch,
  };
}

export function useInvalidateSavedQuotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SAVED_QUOTES_QUERY_KEY });
}
