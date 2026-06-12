// Product-domain types for the standalone Products wizard.
// Duplicated from the productivity wizard so this feature is fully independent.

export interface Category {
  IdCategory: string | number
  Descr: string
  Code: string
  AggregatedCode: string
  IsSKU: boolean
  IdSKUTemplate: number
  Children?: Category[]
}

export interface SKURule {
  IdSKUTemplateRule: number
  IdSKUTemplate: number
  RuleName: string
  IdParameter: number
  Order: number
}

export interface SKUTemplate {
  IdSKUTemplate: number
  ShortName: string
  Descr: string
  SKUR: SKURule[]
}

export interface ParameterAttribute {
  shortName: string
  code: string
  descr: string
}

export interface Parameter {
  idParameter: number
  paramCategory: string
  shortName: string
  descr: string
  paramAttributes: ParameterAttribute[]
}

export interface ProductVariety {
  IdVariety: number
  Name: string
  Qty: number
}

export interface MasterProduct {
  MasterProductName: string
  SKU: string
  MeasurementUnit: string
  MeasurementUnitValue: number
  MV: ProductVariety[]
}