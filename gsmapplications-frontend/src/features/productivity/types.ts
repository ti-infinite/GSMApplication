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

// Employee.idEmployee is numeric from backend (EmployeeDTO pending Id field)
export interface Employee {
  id:          string   // internal UI id
  idEmployee?: number   // numeric backend Id — required for create-trx
  name:        string
  role:        string
  avatar?:     string
}

export interface EmployeeGroup {
  id:        string
  name:      string
  employees: Employee[]
}

// Grower maps from SupplierDTO
export interface Grower {
  id:               string   // internal UI id (idSupplier GUID)
  idThirdSupplier:  string   // → IdGrower in create-trx payload
  name:             string   // nameSupplier → NameGrower
  location?:        string
  region?:          string
  country?:         string
  categorySupplier?: string
}

export type AssignmentMode = 'groups' | 'individual'

// ── Checkout ──────────────────────────────────────────────────────

// One unit = one TRX (one group OR one individual)
export interface CheckoutUnit {
  trxId:       string      // returned by backend after create-trx
  name:        string      // "Grupo 1" or employee name
  employees:   Employee[]
  varietyName: string
  sku:         string
  initialQty:  number
}

// A single lap/measurement for a unit
export interface LapRecord {
  id:        string
  unitTrxId: string
  amount:    number      // integer
  timestamp: Date
}

// Accumulated state per unit during checkout
export interface UnitCheckout {
  unit:     CheckoutUnit
  laps:     LapRecord[]
  waste:    number
  totalQty: number      // sum of laps
}

export interface AssignmentWizardConfig {
  categories:      Category[]
  skuTemplates:    SKUTemplate[]
  parameters:      Parameter[]          // only SKU-builder params (in SKUR)
  productionTypes: ParameterAttribute[] // from paramCategory: "PRDTYPE"
  masterProducts:  MasterProduct[]
  employees:       Employee[]
  growers:         Grower[]
}

export interface AssignmentResult {
  product:        MasterProduct
  variety:        ProductVariety
  initialQty:     number
  skuPrefix:      string
  mode:           AssignmentMode
  employeeGroups: EmployeeGroup[]
  grower:         Grower
  itc:            string
  productionType: string      // code from PRDTYPE parameter
  trxIds:         string[]    // IDs returned by backend after create-trx (one per group/individual)
}