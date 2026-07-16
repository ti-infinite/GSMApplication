// Public API of the product entity.
// Import product-domain types and the SKU builder from here — never deep paths.
export type {
  Category,
  SKURule,
  SKUTemplate,
  ParameterAttribute,
  Parameter,
  ProductVariety,
  MasterProduct,
} from './model/types'

export { useSkuBuilder } from './model/useSkuBuilder'
export type { UseSkuBuilderResult, SkuBuilderOptions } from './model/useSkuBuilder'

export { SkuParamFields } from './ui/SkuParamFields'
export type { SkuParamLabels } from './ui/SkuParamFields'
export { SkuChips } from './ui/SkuChips'
export { VarietyList } from './ui/VarietyList'
