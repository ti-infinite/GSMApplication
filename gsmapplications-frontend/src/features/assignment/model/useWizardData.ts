import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getFilteredEmployees,
  getFilteredSuppliers,
} from '@/shared/api/operations/endpoints'
import { getStoredUser, isSessionActive } from '@/shared/lib/auth'
import type {
  EmployeeDTOListApiResponse,
  SupplierDTOListApiResponse,
} from '@/shared/api/operations/model'
import type { AssignmentWizardConfig, Grower } from './types'
import { useSkuCatalog } from '@/entities/product'
import type { Employee } from '@/entities/employee'

export function useWizardData() {
  // Only fire once the session cookie is present, so no wizard query can be
  // sent before the auth token is set (a pre-token request returns 401/HTML
  // that the browser can cache against these cacheable GET URLs).
  const enabled = isSessionActive()

  // ── SKU catalog (categories, SKU definitions, parameters, master products) ──
  const { catalog, isLoading: lc, isError: ec } = useSkuCatalog({ enabled })

  // ── Employees — filtered by the current user's location ─────────
  // POST endpoint → driven through useQuery with the raw fetcher.
  const { data: employees = [], isLoading: l5, isError: e5 } = useQuery({
    queryKey: ['filtered-employees'],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: () => getFilteredEmployees(),
    select: res => {
      const userLocation = (getStoredUser()?.location ?? '').toLowerCase()
      return ((res.data as EmployeeDTOListApiResponse).data ?? [])
        .filter(e => !userLocation || (e.location ?? '').toLowerCase() === userLocation)
        .map((e, i) => ({
          id:         `emp-${i}`,
          idEmployee: e.idEmployee,   // real backend Id → used in create-trx Employee attr
          name:       e.fullName ?? '',
          role:       e.location ?? 'Harvester',
        }) satisfies Employee)
    },
  })

  // ── Suppliers / Growers ─────────────────────────────────────────
  // POST endpoint → driven through useQuery with the raw fetcher.
  const { data: growers = [], isLoading: l6, isError: e6 } = useQuery({
    queryKey: ['filtered-suppliers'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getFilteredSuppliers(),
    select: res => ((res.data as SupplierDTOListApiResponse).data ?? []).map(s => ({
      id:               s.idSupplier ?? '',
      idThirdSupplier:  s.idThirdSupplier ?? '',
      name:             s.nameSupplier ?? '',
      location:         s.region ?? undefined,
      region:           s.region ?? undefined,
      country:          s.country ?? undefined,
      categorySupplier: s.categorySupplier ?? undefined,
    }) satisfies Grower),
  })

  const isLoading = lc || l5 || l6
  const isError   = ec || e5 || e6

  const data = useMemo<AssignmentWizardConfig | null>(() => {
    if (isLoading || isError) return null

    // PRDTYPE options -- read from ALL parameters, not just the SKU ones
    const productionTypes = catalog.parameters
      .find(p => p.paramCategory === 'PRDTYPE')
      ?.paramAttributes ?? []

    return {
      categories:     catalog.categories,
      skuTemplates:   catalog.skuTemplates,
      parameters:     catalog.skuParameters,
      productionTypes,
      masterProducts: catalog.masterProducts,
      employees,
      growers,
    }
  }, [isLoading, isError, catalog, employees, growers])

  return { data, isLoading, isError }
}