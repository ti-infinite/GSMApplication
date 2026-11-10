export type SupplierType = 'agro' | 'third_party'
export type CreditStatus = 'pending' | 'approved' | 'denied'
export type Whs = 'BOS' | 'CHI' | 'MIA' | 'NJ'
export type PhotoSlot = 'box_label' | 'temperature' | 'product'
export type FinishedOrLoose = 'FINISHED' | 'LOOSE'
export type DocVariant = 'supplier' | 'internal'
export type DocFormat = 'xlsx' | 'pdf'

export const FLAG_KEYS = [
  'flag_rotten',
  'flag_mech_dam',
  'flag_leaf_spots',
  'flag_cold_damage',
  'flag_dehydrated',
  'flag_long_stems',
] as const
export type FlagKey = (typeof FLAG_KEYS)[number]

/** A credit line as the API accepts it (everything the rep / admin can type). */
export interface LineItemIn {
  product_name: string
  code?: string | null
  box_weight?: number | null
  presentation?: string | null
  finished_or_loose?: FinishedOrLoose | null
  qty_order?: number | null
  qty_received?: number | null
  gross_weight?: number | null
  net_weight?: number | null
  final_yield_oz?: number | null
  labor_cost?: number | null
  price_unit?: number | null
  freight_unit?: number | null
  box_qty_credit_override?: number | null
  temperature?: number | null
  flag_rotten: boolean
  flag_mech_dam: boolean
  flag_leaf_spots: boolean
  flag_cold_damage: boolean
  flag_dehydrated: boolean
  flag_long_stems: boolean
  observations?: string | null
}

/** A stored line: the input plus what the server computes. */
export interface LineItem extends LineItemIn {
  id: number
  position: number
  qty_credit: number | null
  unit_cost: number | null
  total_credit_cost: number | null
  usable_qty: number | null
}

export interface CreditPhoto {
  id: number
  slot: PhotoSlot
  filename: string
}

export interface CreditSummary {
  id: number
  supplier_type: SupplierType
  company_name: string
  report_date: string
  po_number: string | null
  po_display: string | null
  jd: number | null
  whs: Whs
  status: CreditStatus
  total_qty_credit: number | null
  total_credit_cost: number | null
  created_at: string
  prealert_id: number | null
  created_by_email: string | null
}

export interface Credit extends CreditSummary {
  qa_inspector: string | null
  arrival_time: string | null
  awb: string | null
  flight: string | null
  recommendations: string | null
  denial_reason: string | null
  decided_at: string | null
  po_cost_source: 'manual' | 'nhubex' | 'none'
  po_total_paid: number | null
  credit_dollar_equiv: number | null
  po_notes: string | null
  updated_at: string | null
  line_items: LineItem[]
  photos: CreditPhoto[]
}

export interface CreditList {
  items: CreditSummary[]
  total: number
  pending: number
}

export interface CreditFilters {
  status?: CreditStatus | ''
  whs?: Whs | ''
}

/** Header fields the admin can edit (lines go in `line_items`). */
export interface CreditUpdate {
  company_name?: string
  report_date?: string
  po_number?: string | null
  qa_inspector?: string | null
  arrival_time?: string | null
  awb?: string | null
  flight?: string | null
  whs?: Whs
  recommendations?: string | null
  line_items?: LineItemIn[]
}

export interface PoLineMatch {
  product_name: string
  qty_credit: number
  unit_price_paid: number | null
  credit_equiv: number | null
  matched: boolean
}

export interface PoCost {
  found: boolean
  source: 'manual' | 'nhubex' | 'none'
  po_code?: string | null
  supplier?: string | null
  po_total_paid?: number | null
  credit_dollar_equiv?: number | null
  po_notes?: string | null
  lines?: { description: string; gro_code: string; qty: number | null; unit_price: number | null; amount: number | null }[]
  match?: { lines: PoLineMatch[]; credit_dollar_equiv: number }
}

export type EmailLanguage = 'en' | 'es'

export interface SendCreditBody {
  supplier_id?: number | null
  emails: string[]
  message?: string | null
  language: EmailLanguage
}

export interface SendResult {
  sent: boolean
  recipients: string[]
  email_enabled: boolean
}

export interface EmailLog {
  id: number
  kind: 'notify' | 'send_supplier' | 'prealert' | string
  recipients: string
  cc: string | null
  subject: string
  status: 'sent' | 'failed' | 'disabled'
  error: string | null
  sent_at: string
}

export type AuditAction =
  | 'created'
  | 'edited'
  | 'approved'
  | 'denied'
  | 'sent'
  | 'po_cost'
  | 'prealert_sent'
  | 'prealert_dismissed'
  | 'prealert_reopened'

export interface AuditChange {
  field: string
  line?: number | null
  old?: unknown
  new?: unknown
}

export interface AuditEvent {
  id: number
  at: string
  actor_email: string | null
  actor_name: string | null
  action: AuditAction | string
  changes: AuditChange[]
}

/** Server-side e-mail configuration, so the UI tells the truth about where mail goes. */
export interface EmailSettings {
  email_enabled: boolean
  cc_on_supplier_send: string | null
  notify_to: string | null
  /** Test mode: when set, every e-mail goes only to this address. */
  redirect_to: string | null
}
