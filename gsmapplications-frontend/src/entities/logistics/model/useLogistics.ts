import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLogistics, fetchLogisticsFilterOptions, saveCarriers } from '../api/logistics'
import type { CarrierChange, LogisticsFilters } from './types'

const STALE_TIME_MS = 60 * 1000
const ROOT_KEY = ['logistics'] as const

export function useLogisticsFilterOptions() {
  const query = useQuery({
    queryKey: [...ROOT_KEY, 'filters'],
    queryFn:  fetchLogisticsFilterOptions,
    staleTime: 5 * 60 * 1000,
  })
  return { options: query.data ?? { whs: [], divisions: [] }, isLoading: query.isLoading }
}

// `enabled: false` until the page has the minimum filters (date range); keeps the
// previous rows only while refetching the SAME filters, never across different ones.
export function useLogistics(filters: LogisticsFilters, enabled: boolean) {
  const query = useQuery({
    queryKey: [...ROOT_KEY, 'rows', filters],
    queryFn:  () => fetchLogistics(filters),
    enabled,
    staleTime: STALE_TIME_MS,
  })
  return {
    rows:      query.data ?? [],
    isLoading: enabled && query.isPending,
    error:     query.error,
    refetch:   query.refetch,
  }
}

export function useSaveCarriers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: CarrierChange[]) => saveCarriers(rows),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: [...ROOT_KEY, 'rows'] }),
  })
}
