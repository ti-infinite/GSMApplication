import { useState, useMemo, useEffect } from 'react'
import type {
  Category, SKUTemplate, Parameter, ParameterAttribute,
  MasterProduct, ProductVariety, SKURule,
} from '../types'

// Duplicated from the productivity wizard so the Products feature is fully
// independent. Keep the selection/validation rules identical.

interface UseSkuBuilderResult {
  selectedCategory:      Category | null
  selectedChildCategory: Category | null
  selectedParams:        Record<number, ParameterAttribute>
  selectedProduct:       MasterProduct | null
  selectedVariety:       ProductVariety | null
  initialQty:            number | null
  effectiveCategory:     Category | null
  skuTemplate:           SKUTemplate | null
  rules:                 SKURule[]
  skuPrefix:             string
  matchingProducts:      MasterProduct[]
  allParamsSelected:     boolean
  isComplete:            boolean
  getParameter:          (rule: SKURule) => Parameter | undefined
  isParamEnabled:        (ruleIndex: number) => boolean
  selectCategory:        (cat: Category | null) => void
  selectChildCategory:   (cat: Category | null) => void
  selectParam:           (idParameter: number, attr: ParameterAttribute | null) => void
  selectProduct:         (product: MasterProduct | null) => void
  selectVariety:         (variety: ProductVariety | null) => void
  setInitialQty:         (qty: number | null) => void
  reset:                 () => void
}

export function useSkuBuilder(
  _categories:    Category[],
  skuTemplates:   SKUTemplate[],
  parameters:     Parameter[],
  masterProducts: MasterProduct[],
): UseSkuBuilderResult {
  const [selectedCategory,      setSelectedCategory]      = useState<Category | null>(null)
  const [selectedChildCategory, setSelectedChildCategory] = useState<Category | null>(null)
  const [selectedParams,        setSelectedParams]        = useState<Record<number, ParameterAttribute>>({})
  const [selectedProduct,       setSelectedProduct]       = useState<MasterProduct | null>(null)
  const [selectedVariety,       setSelectedVariety]       = useState<ProductVariety | null>(null)
  const [initialQty,            setInitialQty]            = useState<number | null>(null)

  const effectiveCategory = selectedChildCategory ?? selectedCategory

  const skuTemplate = useMemo(
    () => effectiveCategory?.IdSKUTemplate
      ? skuTemplates.find(t => t.IdSKUTemplate === effectiveCategory.IdSKUTemplate) ?? null
      : null,
    [effectiveCategory, skuTemplates],
  )

  const rules = useMemo(
    () => [...(skuTemplate?.SKUR ?? [])].sort((a, b) => a.Order - b.Order),
    [skuTemplate],
  )

  const getParameter = (rule: SKURule) =>
    parameters.find(p => p.idParameter === rule.IdParameter)

  const isParamEnabled = (ruleIndex: number): boolean => {
    if (ruleIndex === 0) return !!effectiveCategory
    const prevRule = rules[ruleIndex - 1]
    return !!selectedParams[prevRule.IdParameter]
  }

  // With SKU templates present this behaves exactly like the wizard (every SKU
  // param must be chosen). Without templates (no rules — this model has no SKU
  // definitions), products are filtered by category. When the category has
  // sub-categories, we wait until one is picked before listing products —
  // otherwise the first screen would show far too many.
  const needsSubcategory = !!(selectedCategory?.Children && selectedCategory.Children.length > 0)
  const allParamsSelected =
    !!effectiveCategory &&
    (!needsSubcategory || !!selectedChildCategory) &&
    rules.every(r => !!selectedParams[r.IdParameter])

  const skuPrefix = useMemo(() => {
    if (!effectiveCategory) return ''
    const base  = effectiveCategory.AggregatedCode
    const parts = rules.map(r => selectedParams[r.IdParameter]?.code ?? '').join('')
    return base + parts
  }, [effectiveCategory, rules, selectedParams])

  const matchingProducts = useMemo(() => {
    if (!allParamsSelected || !skuPrefix) return []

    // Merge entries with same SKU — the API can return one row per variety
    const merged = new Map<string, MasterProduct>()
    for (const product of masterProducts.filter(p => p.SKU.startsWith(skuPrefix))) {
      const existing = merged.get(product.SKU)
      if (existing) {
        merged.set(product.SKU, { ...existing, MV: [...existing.MV, ...product.MV] })
      } else {
        merged.set(product.SKU, { ...product, MV: [...product.MV] })
      }
    }
    // Hide products without varieties — they can't be assigned downstream
    return Array.from(merged.values()).filter(p => p.MV.length > 0)
  }, [skuPrefix, allParamsSelected, masterProducts])

  // Auto-select when only one product matches
  useEffect(() => {
    if (matchingProducts.length === 1) setSelectedProduct(matchingProducts[0])
    else                               setSelectedProduct(null)
    setSelectedVariety(null)
  }, [matchingProducts])

  // Auto-select variety when product has only one MV
  useEffect(() => {
    if (!selectedProduct) { setSelectedVariety(null); return }
    if (selectedProduct.MV.length === 1) setSelectedVariety(selectedProduct.MV[0])
    else                                 setSelectedVariety(null)
  }, [selectedProduct])

  const selectCategory = (cat: Category | null) => {
    setSelectedCategory(cat)
    setSelectedChildCategory(null)
    setSelectedParams({})
    setSelectedProduct(null)
    setSelectedVariety(null)
  }

  const selectChildCategory = (cat: Category | null) => {
    setSelectedChildCategory(cat)
    setSelectedParams({})
    setSelectedProduct(null)
    setSelectedVariety(null)
  }

  const selectParam = (idParameter: number, attr: ParameterAttribute | null) => {
    setSelectedParams(prev => {
      const next = { ...prev }
      if (!attr) {
        delete next[idParameter]
        const idx = rules.findIndex(r => r.IdParameter === idParameter)
        rules.slice(idx + 1).forEach(r => delete next[r.IdParameter])
      } else {
        next[idParameter] = attr
        const idx = rules.findIndex(r => r.IdParameter === idParameter)
        rules.slice(idx + 1).forEach(r => delete next[r.IdParameter])
      }
      return next
    })
    setSelectedProduct(null)
    setSelectedVariety(null)
  }

  const reset = () => {
    setSelectedCategory(null)
    setSelectedChildCategory(null)
    setSelectedParams({})
    setSelectedProduct(null)
    setSelectedVariety(null)
  }

  return {
    selectedCategory,
    selectedChildCategory,
    selectedParams,
    selectedProduct,
    selectedVariety,
    effectiveCategory,
    skuTemplate,
    rules,
    skuPrefix,
    matchingProducts,
    allParamsSelected,
    isComplete:          !!selectedProduct && !!selectedVariety && !!initialQty && initialQty > 0,
    getParameter,
    isParamEnabled,
    selectCategory,
    selectChildCategory,
    selectParam,
    selectProduct:       setSelectedProduct,
    selectVariety:       setSelectedVariety,
    initialQty,
    setInitialQty,
    reset,
  }
}