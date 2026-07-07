import { useMemo } from 'react'
import {
  useGetCategories,
  useGetParameters,
  useGetMasterProducts,
} from '@/shared/api/operations/operations/operations'
import { isSessionActive } from '@/shared/lib/auth'
import type {
  GlobalParameterListApiResponse,
  MasterProductDTOListApiResponse,
  StringApiResponse,
} from '@/shared/api/operations/model'
import type { Category, Parameter, MasterProduct } from '@/entities/product'

export interface ProductData {
  categories:     Category[]
  parameters:     Parameter[]
  masterProducts: MasterProduct[]
}

/**
 * Loads the data the product selector needs for this model: categories,
 * parameters and master products (where the products come from).
 * NOTE: SKU definitions are NOT requested — that endpoint isn't implemented for
 * this model yet, so the SKU builder receives an empty templates array.
 *
 * Same validations as the wizard: queries only fire once the session cookie is
 * present, JSON-string payloads are parsed defensively, and results are cached.
 */
export function useProductData() {
  const enabled = isSessionActive()

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

  // ── Parameters ──────────────────────────────────────────────────
  const { data: parameters = [], isLoading: l2, isError: e2 } = useGetParameters({
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

  // ── Master Products — where the products are filled from ────────
  const { data: masterProducts = [], isLoading: l3, isError: e3 } = useGetMasterProducts({
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

  const isLoading = l1 || l2 || l3
  const isError   = e1 || e2 || e3

  const data = useMemo<ProductData | null>(() => {
    if (isLoading || isError) return null
    return { categories, parameters, masterProducts }
  }, [isLoading, isError, categories, parameters, masterProducts])

  return { data, isLoading, isError }
}