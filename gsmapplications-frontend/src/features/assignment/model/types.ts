// Assignment domain types. Product/employee primitives come from their entities;
// import them directly from @/entities/* where you need them.
import type {
  Category, SKUTemplate, Parameter, ParameterAttribute,
  MasterProduct, ProductVariety,
} from '@/entities/product'
import type { Employee } from '@/entities/employee'

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