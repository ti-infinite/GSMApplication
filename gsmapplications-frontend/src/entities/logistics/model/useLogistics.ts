import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logisticsApi } from "../api/logistics";
import type { LogisticsFilters, LogisticsLine, LogisticsRow, LogisticsUpdateBody } from "./types";

export const LOGISTICS_QUERY_KEY = ["logistics"] as const;
const linesKey = (id: number) => ["logistics-lines", id] as const;

const STALE_TIME_MS = 60 * 1000;

export function useLogistics() {
  const query = useQuery({
    queryKey: LOGISTICS_QUERY_KEY,
    queryFn: logisticsApi.list,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Warehouse list for the WHS filter (ERP master data). */
export function useLogisticsFilters() {
  const query = useQuery({
    queryKey: ["logistics-filters"],
    queryFn: logisticsApi.filters,
    staleTime: 30 * 60 * 1000,
  });
  const empty: LogisticsFilters = { warehouses: [] };
  return { filters: query.data ?? empty, isLoading: query.isLoading };
}

/** Lines of one invoice, fetched when its details dialog opens. */
export function useLogisticsLines(id: number | null) {
  const query = useQuery({
    queryKey: linesKey(id ?? -1),
    queryFn: () => logisticsApi.lines(id as number),
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
  return {
    lines: (query.data ?? []) as LogisticsLine[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Saves one row and patches it into the cached list, so the table updates in
 *  place without a full reload. */
export function useUpdateLogisticsRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: LogisticsUpdateBody }) => logisticsApi.update(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<LogisticsRow[]>(LOGISTICS_QUERY_KEY, (rows) =>
        rows ? rows.map((r) => (r.ID === updated.ID ? updated : r)) : rows
      );
    },
  });
}
