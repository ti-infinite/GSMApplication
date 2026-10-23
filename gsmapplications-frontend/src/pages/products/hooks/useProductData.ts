import { useMemo } from 'react'
import { useSkuCatalog } from '@/entities/product'
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
 */
export function useProductData() {
  const { catalog, isLoading, isError } = useSkuCatalog({ includeSkuDefinitions: false })

  const data = useMemo<ProductData | null>(() => {
    if (isLoading || isError) return null
    return { categories: catalog.categories, parameters: catalog.parameters, masterProducts: catalog.masterProducts }
  }, [isLoading, isError, catalog])

  return { data, isLoading, isError }
}
