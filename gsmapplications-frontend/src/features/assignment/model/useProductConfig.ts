import { useState, useCallback } from 'react'
import type { ConfiguredProduct, Grower } from './types'
import type { MasterProduct, ProductVariety } from '@/entities/product'

interface AddProductInput {
  product:    MasterProduct
  variety:    ProductVariety
  skuPrefix:  string
  defaultQty: number
}

interface UseProductConfigResult {
  products:          ConfiguredProduct[]
  productionType:    string
  isComplete:        boolean
  addProduct:        (input: AddProductInput) => void
  removeProduct:     (id: string) => void
  setDefaultQty:     (id: string, qty: number) => void
  addGrower:         (id: string, grower: Grower) => void
  removeGrower:      (id: string, growerId: string) => void
  setGrowerItc:      (id: string, growerId: string, itc: string) => void
  setProductionType: (code: string) => void
  reset:             () => void
}

/**
 * Single source of truth for step 1: the pool of configured products. Each
 * product carries its default qty + 1..N growers (with ITC) + a production type.
 * Production type is a global selector for now, but stored per-product so the
 * model is already per-product capable (generic).
 */
export function useProductConfig(): UseProductConfigResult {
  const [products,       setProducts]           = useState<ConfiguredProduct[]>([])
  const [productionType, setProductionTypeState] = useState('')

  const addProduct = useCallback((input: AddProductInput) => {
    setProducts(prev => [
      ...prev,
      {
        id:             crypto.randomUUID(),
        product:        input.product,
        variety:        input.variety,
        skuPrefix:      input.skuPrefix,
        defaultQty:     input.defaultQty,
        growers:        [],
        productionType,
      },
    ])
  }, [productionType])

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
  }, [])

  const setDefaultQty = useCallback((id: string, qty: number) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, defaultQty: qty } : p)))
  }, [])

  const addGrower = useCallback((id: string, grower: Grower) => {
    setProducts(prev => prev.map(p =>
      p.id === id && !p.growers.some(g => g.grower.id === grower.id)
        ? { ...p, growers: [...p.growers, { grower, itc: '' }] }
        : p,
    ))
  }, [])

  const removeGrower = useCallback((id: string, growerId: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, growers: p.growers.filter(g => g.grower.id !== growerId) } : p,
    ))
  }, [])

  const setGrowerItc = useCallback((id: string, growerId: string, itc: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id
        ? { ...p, growers: p.growers.map(g => (g.grower.id === growerId ? { ...g, itc } : g)) }
        : p,
    ))
  }, [])

  // Global production type — keeps every product in sync (per-product capable model).
  const setProductionType = useCallback((code: string) => {
    setProductionTypeState(code)
    setProducts(prev => prev.map(p => ({ ...p, productionType: code })))
  }, [])

  const reset = useCallback(() => {
    setProducts([])
    setProductionTypeState('')
  }, [])

  const isComplete =
    products.length > 0 &&
    productionType.length > 0 &&
    products.every(p =>
      p.defaultQty > 0 &&
      p.growers.length > 0 &&
      p.growers.every(g => g.itc.trim().length > 0),
    )

  return {
    products,
    productionType,
    isComplete,
    addProduct,
    removeProduct,
    setDefaultQty,
    addGrower,
    removeGrower,
    setGrowerItc,
    setProductionType,
    reset,
  }
}
