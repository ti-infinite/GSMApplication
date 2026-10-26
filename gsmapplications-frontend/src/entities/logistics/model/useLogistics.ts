import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logisticsApi } from "../api/logistics";
import type { CarrierSlot, LogisticsFilters, LogisticsLine, LogisticsRow, LogisticsUpdateBody } from "./types";

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
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: query.refetch,
  };
}

/** Warehouse and customer lists for the filters (ERP master data). */
export function useLogisticsFilters() {
  const query = useQuery({
    queryKey: ["logistics-filters"],
    queryFn: logisticsApi.filters,
    staleTime: 30 * 60 * 1000,
  });
  const empty: LogisticsFilters = { warehouses: [], customers: [] };
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
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}

/** Writes that patch the cached row from the relay's response, so the table
 *  updates in place without a full reload. */
export function useLogisticsMutations() {
  const queryClient = useQueryClient();

  function patchRow(updated: LogisticsRow) {
    queryClient.setQueryData<LogisticsRow[]>(LOGISTICS_QUERY_KEY, (rows) =>
      rows ? rows.map((r) => (r.ID === updated.ID ? updated : r)) : rows
    );
  }

  return {
    async update(id: number, body: LogisticsUpdateBody) {
      const row = await logisticsApi.update(id, body);
      patchRow(row);
      return row;
    },
    async confirm(id: number, option: CarrierSlot | null) {
      const row = await logisticsApi.confirm(id, option);
      patchRow(row);
      return row;
    },
    invalidate: () => queryClient.invalidateQueries({ queryKey: LOGISTICS_QUERY_KEY }),
  };
}
