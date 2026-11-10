import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prealertsApi } from '../api/prealerts'
import type { PreAlert, PreAlertFilters } from './types'

export const prealertKeys = {
  list: (filters: PreAlertFilters) => ['prealerts', 'list', filters.status ?? '', filters.whs ?? ''] as const,
  detail: (id: number) => ['prealerts', 'detail', id] as const,
  emails: (id: number) => ['prealerts', 'emails', id] as const,
  events: (id: number) => ['prealerts', 'events', id] as const,
}

const LIST_REFRESH_MS = 60 * 1000

export function usePrealerts(filters: PreAlertFilters) {
  const query = useQuery({
    queryKey: prealertKeys.list(filters),
    queryFn: () => prealertsApi.list(filters),
    staleTime: LIST_REFRESH_MS,
    refetchInterval: LIST_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    open: query.data?.open ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

export function usePrealert(id: number | null) {
  const query = useQuery({
    queryKey: prealertKeys.detail(id ?? -1),
    queryFn: () => prealertsApi.get(id as number),
    enabled: id !== null,
  })
  return { prealert: query.data ?? null, isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export function usePrealertEmails(id: number | null) {
  const query = useQuery({ queryKey: prealertKeys.emails(id ?? -1), queryFn: () => prealertsApi.emails(id as number), enabled: id !== null })
  return { emails: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export function usePrealertEvents(id: number | null) {
  const query = useQuery({ queryKey: prealertKeys.events(id ?? -1), queryFn: () => prealertsApi.events(id as number), enabled: id !== null })
  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

function usePrealertWriter() {
  const queryClient = useQueryClient()
  return (pa: PreAlert) => {
    queryClient.setQueryData(prealertKeys.detail(pa.id), pa)
    void queryClient.invalidateQueries({ queryKey: ['prealerts', 'list'] })
    void queryClient.invalidateQueries({ queryKey: prealertKeys.events(pa.id) })
  }
}

export function useDismissPrealert() {
  const write = usePrealertWriter()
  return useMutation({ mutationFn: (id: number) => prealertsApi.dismiss(id), onSuccess: write })
}

export function useReopenPrealert() {
  const write = usePrealertWriter()
  return useMutation({ mutationFn: (id: number) => prealertsApi.reopen(id), onSuccess: write })
}

export function useResendPrealert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => prealertsApi.resend(id),
    onSuccess: (_r, id) => {
      void queryClient.invalidateQueries({ queryKey: prealertKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: prealertKeys.emails(id) })
      void queryClient.invalidateQueries({ queryKey: prealertKeys.events(id) })
    },
  })
}
