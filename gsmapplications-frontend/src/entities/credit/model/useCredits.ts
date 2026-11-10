import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { creditsApi } from '../api/credits'
import type { Credit, CreditFilters, CreditUpdate, SendCreditBody } from './types'

export const creditKeys = {
  all: ['credits'] as const,
  list: (filters: CreditFilters) => ['credits', 'list', filters.status ?? '', filters.whs ?? ''] as const,
  detail: (id: number) => ['credits', 'detail', id] as const,
  events: (id: number) => ['credits', 'events', id] as const,
  emails: (id: number) => ['credits', 'emails', id] as const,
}

const LIST_REFRESH_MS = 60 * 1000

export function useCredits(filters: CreditFilters) {
  const query = useQuery({
    queryKey: creditKeys.list(filters),
    queryFn: () => creditsApi.list(filters),
    staleTime: LIST_REFRESH_MS,
    refetchInterval: LIST_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    pending: query.data?.pending ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    dataUpdatedAt: query.dataUpdatedAt,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCredit(id: number | null) {
  const query = useQuery({
    queryKey: creditKeys.detail(id ?? -1),
    queryFn: () => creditsApi.get(id as number),
    enabled: id !== null,
  })
  return { credit: query.data ?? null, isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export function useCreditEvents(id: number | null) {
  const query = useQuery({
    queryKey: creditKeys.events(id ?? -1),
    queryFn: () => creditsApi.events(id as number),
    enabled: id !== null,
  })
  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export function useCreditEmails(id: number | null) {
  const query = useQuery({
    queryKey: creditKeys.emails(id ?? -1),
    queryFn: () => creditsApi.emails(id as number),
    enabled: id !== null,
  })
  return { emails: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

/** Puts the fresh credit in the detail cache and refreshes everything derived from it. */
function useCreditWriter() {
  const queryClient = useQueryClient()
  return (credit: Credit) => {
    queryClient.setQueryData(creditKeys.detail(credit.id), credit)
    void queryClient.invalidateQueries({ queryKey: ['credits', 'list'] })
    void queryClient.invalidateQueries({ queryKey: creditKeys.events(credit.id) })
  }
}

export function useUpdateCredit() {
  const write = useCreditWriter()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CreditUpdate }) => creditsApi.update(id, body),
    onSuccess: write,
  })
}

export function useApproveCredit() {
  const write = useCreditWriter()
  return useMutation({ mutationFn: (id: number) => creditsApi.approve(id), onSuccess: write })
}

export function useDenyCredit() {
  const write = useCreditWriter()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string | null }) => creditsApi.deny(id, reason),
    onSuccess: write,
  })
}

export function useSetPoCost() {
  const write = useCreditWriter()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { po_total_paid: number | null; po_notes: string | null } }) =>
      creditsApi.setPoCost(id, body),
    onSuccess: write,
  })
}

/** NHUBEX lookup (refresh=true re-queries and caches the result on the credit). */
export function useLookupPoCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, refresh }: { id: number; refresh: boolean }) => creditsApi.poCost(id, refresh),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: creditKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: creditKeys.events(id) })
    },
  })
}

export function useSendCredit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SendCreditBody }) => creditsApi.send(id, body),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: creditKeys.emails(id) })
      void queryClient.invalidateQueries({ queryKey: creditKeys.events(id) })
    },
  })
}

export function useEmailSettings() {
  const query = useQuery({ queryKey: ['credits', 'email-settings'], queryFn: creditsApi.emailSettings, staleTime: 10 * 60 * 1000 })
  return query.data ?? null
}
