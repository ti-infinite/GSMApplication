import { useQuery } from "@tanstack/react-query";
import { grossMarginRefQueryKey } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { fetchCommissions } from "../api/commissions";

// Manually-edited reference data (not a live external feed like db_ai.Sales)
// -- a mutation invalidates this immediately, so staleTime only needs to
// cover ordinary re-navigation between Quote Simulator and Updates.
const STALE_TIME_MS = 5 * 60 * 1000;

export function useCommissions() {
  const query = useQuery({
    queryKey: grossMarginRefQueryKey("commission"),
    queryFn: fetchCommissions,
    staleTime: STALE_TIME_MS,
    // A fresh observer (e.g. a brand-new mount after Quote Simulator <->
    // Updates swaps components) re-evaluates staleness at creation and can
    // flip stale=true even when dataUpdatedAt is only seconds old -- see
    // the sibling reference-data hooks for the same setting. Edits still
    // show up immediately via the explicit invalidateQueries() after any
    // mutation; this only stops the redundant mount-time refetch.
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });

  return {
    commissions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
