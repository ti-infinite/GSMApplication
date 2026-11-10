import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { creditSuppliersApi, fetchGsmSuppliers } from '../api/suppliers'
import type { CreditSupplierInput } from './types'

export const CREDIT_SUPPLIERS_KEY = ['credit-suppliers'] as const

export function useCreditSuppliers() {
  const query = useQuery({ queryKey: CREDIT_SUPPLIERS_KEY, queryFn: creditSuppliersApi.list, staleTime: 5 * 60 * 1000 })
  return { suppliers: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

function useInvalidateSuppliers() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: CREDIT_SUPPLIERS_KEY })
}

export function useSaveCreditSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: CreditSupplierInput }) =>
      id === null ? creditSuppliersApi.create(body) : creditSuppliersApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteCreditSupplier() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({ mutationFn: (id: number) => creditSuppliersApi.remove(id), onSuccess: invalidate })
}

/** Pulls GSM's supplier master and merges it into the directory (names + the one e-mail each carries). */
export function useImportGsmSuppliers() {
  const invalidate = useInvalidateSuppliers()
  return useMutation({
    mutationFn: async () => creditSuppliersApi.bulk(await fetchGsmSuppliers()),
    onSuccess: invalidate,
  })
}
