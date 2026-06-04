import { useMemo } from 'react'
import {
  useGetCategories,
  useGetSkuDefinitions,
  useGetParameters,
  useGetMasterProducts,
  useGetFilteredEmployees,
  useGetFilteredSuppliers,
} from '@/shared/api/operations/operations/operations'
import type {
  GlobalParameterListApiResponse,
  MasterProductDTOListApiResponse,
  EmployeeDTOListApiResponse,
  SupplierDTOListApiResponse,
  StringApiResponse,
} from '@/shared/api/operations/model'
import type {
  AssignmentWizardConfig,
  Category,
  SKUTemplate,
  Parameter,
  MasterProduct,
  Employee,
  Grower,
} from '../types'

export function useWizardData() {
  // ── Categories — comes as JSON string ──────────────────────────
  const { data: categories = [], isLoading: l1, isError: e1 } = useGetCategories({
    query: {
      staleTime: 5 * 60 * 1000,
      select: res => {
        try { return JSON.parse((res.data as StringApiResponse).data ?? '[]') as Category[] }
        catch { return [] }
      },
    },
  })

  // ── SKU Definitions — comes as JSON string ──────────────────────
  const { data: skuTemplates = [], isLoading: l2, isError: e2 } = useGetSkuDefinitions({
    query: {
      staleTime: 5 * 60 * 1000,
      select: res => {
        try { return JSON.parse((res.data as StringApiResponse).data ?? '[]') as SKUTemplate[] }
        catch { return [] }
      },
    },
  })

  // ── Parameters ──────────────────────────────────────────────────
  const { data: parameters = [], isLoading: l3, isError: e3 } = useGetParameters({
    query: {
      staleTime: 5 * 60 * 1000,
      select: res => ((res.data as GlobalParameterListApiResponse).data ?? []).map(p => ({
        idParameter:     p.idParameter ?? 0,
        paramCategory:   p.paramCategory ?? '',
        shortName:       p.shortName ?? '',
        descr:           p.descr ?? '',
        paramAttributes: (p.paramAttributes ?? []).map(a => ({
          shortName: a.shortName ?? '',
          code:      a.code ?? '',
          descr:     a.descr ?? '',
        })),
      }) satisfies Parameter),
    },
  })

  // ── Master Products ─────────────────────────────────────────────
  const { data: masterProducts = [], isLoading: l4, isError: e4 } = useGetMasterProducts({
    query: {
      staleTime: 5 * 60 * 1000,
      select: res => ((res.data as MasterProductDTOListApiResponse).data ?? []).map(p => ({
        MasterProductName:    p.masterProductName ?? '',
        SKU:                  p.sku ?? '',
        MeasurementUnit:      p.measurementUnit ?? '',
        MeasurementUnitValue: Number(p.measurementUnitValue ?? 0),
        MV: (p.mv ?? []).map(v => ({
          IdVariety: v.idVariety ?? 0,
          Name:      v.name ?? '',
          Qty:       Number(v.qty ?? 0),
        })),
      }) satisfies MasterProduct),
    },
  })

  // ── Employees ───────────────────────────────────────────────────
  const { data: employees = [], isLoading: l5, isError: e5 } = useGetFilteredEmployees(undefined, {
    query: {
      staleTime: 2 * 60 * 1000,
      select: res => ((res.data as EmployeeDTOListApiResponse).data ?? []).map((e, i) => ({
        id:   `emp-${i}`,
        name: e.fullName ?? '',
        role: e.location ?? 'Harvester',
        // idEmployee: pending backend — EmployeeDTO needs Id field for create-trx
      }) satisfies Employee),
    },
  })

  // ── Suppliers / Growers ─────────────────────────────────────────
  const { data: growers = [], isLoading: l6, isError: e6 } = useGetFilteredSuppliers(undefined, {
    query: {
      staleTime: 5 * 60 * 1000,
      select: res => ((res.data as SupplierDTOListApiResponse).data ?? []).map(s => ({
        id:               s.idSupplier ?? '',
        idThirdSupplier:  s.idThirdSupplier ?? '',
        name:             s.nameSupplier ?? '',
        location:         s.region ?? undefined,
        region:           s.region ?? undefined,
        country:          s.country ?? undefined,
        categorySupplier: s.categorySupplier ?? undefined,
      }) satisfies Grower),
    },
  })

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6
  const isError   = e1 || e2 || e3 || e4 || e5 || e6

  const data = useMemo<AssignmentWizardConfig | null>(() => {
    if (isLoading || isError) return null

    // IDs referenced in any SKU template rule → go to useSkuBuilder
    const skuParamIds   = new Set(skuTemplates.flatMap(t => t.SKUR.map(r => r.IdParameter)))
    const skuParameters = parameters.filter(p => skuParamIds.has(p.idParameter))

    // PRDTYPE options
    const productionTypes = parameters
      .find(p => p.paramCategory === 'PRDTYPE')
      ?.paramAttributes ?? []

    return {
      categories,
      skuTemplates,
      parameters:     skuParameters,
      productionTypes,
      masterProducts,
      employees,
      growers,
    }
  }, [isLoading, isError, categories, skuTemplates, parameters, masterProducts, employees, growers])

  return { data, isLoading, isError }
}