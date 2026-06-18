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
  id:         string
  name:       string
  employees:  Employee[]
  productId?: string   // → ConfiguredProduct.id, assigned in step 2 (mesa de trabajo)
  qty?:       number   // per-group quantity; defaults to the product's defaultQty
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
  amount:    number      // integer — produced quantity for this lap
  waste:     number      // integer — waste recorded for this lap
  timestamp: Date
}

// Accumulated state per unit during checkout
export interface UnitCheckout {
  unit:       CheckoutUnit
  laps:       LapRecord[]
  totalQty:   number     // sum of lap amounts
  totalWaste: number     // sum of lap wastes — sent to backend as the "Waste" attribute
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

// A grower the user picked, with its own ITC value
export interface SelectedGrower {
  grower: Grower
  itc:    string
}

// A product configured in step 1: variety + default qty + its own grower(s) + prod.
// type. Each work group (mesa) in step 2 references one of these by id.
export interface ConfiguredProduct {
  id:             string
  product:        MasterProduct
  variety:        ProductVariety
  skuPrefix:      string
  defaultQty:     number
  growers:        SelectedGrower[]   // 1..N growers, each with its ITC
  productionType: string             // PRDTYPE code (defaults to the global selection)
}

export interface AssignmentResult {
  products:       ConfiguredProduct[]   // the pool configured in step 1
  employeeGroups: EmployeeGroup[]        // mesas, each carrying productId + qty
  mode:           AssignmentMode
  trxIds:         string[]               // IDs returned by backend (one per group)
}