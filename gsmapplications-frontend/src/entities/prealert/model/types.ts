import type { CreditPhoto, FinishedOrLoose, SupplierType, Whs } from '@/entities/credit'

export type PreAlertStatus = 'open' | 'credited' | 'dismissed'

export interface PreAlertItem {
  id: number
  position: number
  product_name: string
  code: string | null
  presentation: string | null
  finished_or_loose: FinishedOrLoose | null
  qty_order: number | null
  qty_received: number | null
  qty_unit: string | null
  problem_pct: number | null
  description: string | null
  temperature: number | null
  flag_rotten: boolean
  flag_mech_dam: boolean
  flag_leaf_spots: boolean
  flag_cold_damage: boolean
  flag_dehydrated: boolean
  flag_long_stems: boolean
  observations: string | null
}

export interface PreAlertSummary {
  id: number
  whs: Whs
  status: PreAlertStatus
  supplier_type: SupplierType
  company_name: string
  report_date: string
  po_number: string | null
  po_display: string | null
  jd: number
  qa_inspector: string | null
  credit_id: number | null
  notified_at: string | null
  created_at: string
  product_names: string[]
  photo_count: number
  max_problem_pct: number | null
}

export interface PreAlert extends PreAlertSummary {
  created_by_email: string | null
  arrival_time: string | null
  awb: string | null
  flight: string | null
  notes: string | null
  updated_at: string
  items: PreAlertItem[]
  photos: CreditPhoto[]
}

export interface PreAlertList {
  items: PreAlertSummary[]
  total: number
  open: number
}

export interface PreAlertFilters {
  status?: PreAlertStatus | ''
  whs?: Whs | ''
}

export interface PreAlertSendResult {
  sent: boolean
  already_sent?: boolean
  recipients?: string[]
  email_enabled: boolean
  notified_at?: string | null
}
