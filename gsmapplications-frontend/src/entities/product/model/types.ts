// Product domain model — generic and tenant-agnostic.
// Shared by any feature that reads the product catalog or builds SKUs
// (productivity assignment, the standalone products wizard, future features).

/** A node in the product category tree; leaf categories carry an SKU template. */
export interface Category {
  IdCategory: string | number
  Descr: string
  Code: string
  AggregatedCode: string
  IsSKU: boolean
  IdSKUTemplate: number
  Children?: Category[]
}

/** One ordered parameter slot within an SKU template. */
export interface SKURule {
  IdSKUTemplateRule: number
  IdSKUTemplate: number
  RuleName: string
  IdParameter: number
  Order: number
}

/** The ordered set of parameters that compose an SKU for a category. */
export interface SKUTemplate {
  IdSKUTemplate: number
  ShortName: string
  Descr: string
  SKUR: SKURule[]
}

/** A selectable value for a parameter (e.g. a color, a size). */
export interface ParameterAttribute {
  shortName: string
  code: string
  descr: string
}

/** A configurable dimension of a product; its attributes are the options. */
export interface Parameter {
  idParameter: number
  paramCategory: string
  shortName: string
  descr: string
  paramAttributes: ParameterAttribute[]
}

/** A concrete variety of a master product. */
export interface ProductVariety {
  IdVariety: number
  Name: string
  Qty: number
}

/** A master product resolved from an SKU, with its varieties. */
export interface MasterProduct {
  MasterProductName: string
  SKU: string
  MeasurementUnit: string
  MeasurementUnitValue: number
  MV: ProductVariety[]
}
