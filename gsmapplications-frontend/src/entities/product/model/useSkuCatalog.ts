import { useMemo } from 'react'
import {
  useGetCategories,
  useGetSkuDefinitions,
  useGetParameters,
  useGetMasterProducts,
} from '@/shared/api/operations/endpoints'
import { isSessionActive } from '@/shared/lib/auth'
import type {
  GlobalParameterListApiResponse,
  MasterProductDTOListApiResponse,
  StringApiResponse,
} from '@/shared/api/operations/model'
import type { Category, SKUTemplate, Parameter, MasterProduct } from './types'

export interface SkuCatalog {
  categories:     Category[]
  skuTemplates:   SKUTemplate[]
  /** Every parameter the operations API knows about. */
  parameters:     Parameter[]
  /** Only the parameters referenced by some SKU template rule — what `useSkuBuilder` needs. */
  skuParameters:  Parameter[]
  masterProducts: MasterProduct[]
}

export interface UseSkuCatalogOptions {
  /**
   * The Products page has no sku-definitions endpoint for its model yet; it
   * passes `false` and receives `skuTemplates: []` without firing the query.
   */
  includeSkuDefinitions?: boolean
  /** Defaults to `isSessionActive()` so no query fires before the auth cookie exists. */
  enabled?: boolean
}

const EMPTY_TEMPLATES: SKUTemplate[] = []

/**
 * The four catalog queries every SKU builder consumer needs (categories, SKU
 * definitions, parameters, master products), in one place. Shared by the
 * Productivity assignment wizard, the Products wizard and the Gross Margin
 * Quote Simulator, so all three build SKUs from the same data.
 *
 * Queries only fire once the session cookie is present (a pre-token request
 * returns 401/HTML that the browser can cache against these GET URLs),
 * JSON-string payloads are parsed defensively, and results are cached.
 */
export function useSkuCatalog(options: UseSkuCatalogOptions = {}) {
  const { includeSkuDefinitions = true } = options
  const enabled = options.enabled ?? isSessionActive()

  // ── Categories — comes as JSON string ──────────────────────────
  const { data: categories = [], isLoading: l1, isError: e1 } = useGetCategories({
    query: {
      enabled,
      staleTime: 5 * 60 * 1000,
      select: res => {
        try { return JSON.parse((res.data as StringApiResponse).data ?? '[]') as Category[] }
        catch { return [] }
      },
    },
  })

  // ── SKU Definitions — comes as JSON string ──────────────────────
  const { data: skuTemplates = EMPTY_TEMPLATES, isLoading: l2, isError: e2 } = useGetSkuDefinitions({
    query: {
      enabled: enabled && includeSkuDefinitions,
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
      enabled,
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
      enabled,
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

  const isLoading = l1 || (includeSkuDefinitions && l2) || l3 || l4
  const isError   = e1 || (includeSkuDefinitions && e2) || e3 || e4

  const catalog = useMemo<SkuCatalog>(() => {
    const skuParamIds   = new Set(skuTemplates.flatMap(t => t.SKUR.map(r => r.IdParameter)))
    const skuParameters = parameters.filter(p => skuParamIds.has(p.idParameter))
    return { categories, skuTemplates, parameters, skuParameters, masterProducts }
  }, [categories, skuTemplates, parameters, masterProducts])

  return { catalog, isLoading, isError }
}
