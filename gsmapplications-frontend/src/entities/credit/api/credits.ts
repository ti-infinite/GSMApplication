import { creditsFetch, creditsQuery, creditsUrl, parseCredits } from '@/shared/lib/ihCredits'
import type {
  AuditEvent, Credit, CreditFilters, CreditList, CreditUpdate, DocFormat, DocVariant, EmailLanguage, EmailLog, EmailSettings, PoCost,
  SendCreditBody, SendResult,
} from '../model/types'

// ih-credits (see shared/lib/ihCredits):
//   GET    /credits?status&whs&supplier_type&limit  -> CreditList
//   GET    /credits/{id}                             -> Credit
//   PATCH  /credits/{id}                             <- CreditUpdate (lines replaced wholesale) -> Credit
//   POST   /credits/{id}/approve | /deny {reason}    -> Credit
//   GET    /credits/{id}/po-cost?refresh             -> PoCost      PUT /credits/{id}/po-cost -> Credit
//   POST   /credits/{id}/send                        <- SendCreditBody -> SendResult
//   GET    /credits/{id}/events | /emails            -> AuditEvent[] | EmailLog[]
//   GET    /credits/{id}/documents/{variant}/{fmt}   (download)      GET /photos/{id}/{file}
const LIST_LIMIT = 500

export const creditsApi = {
  async list(filters: CreditFilters = {}): Promise<CreditList> {
    // Agroaromas credits are out of scope for this module: only third-party ones are listed.
    const qs = creditsQuery({ status: filters.status, whs: filters.whs, supplier_type: 'third_party', limit: LIST_LIMIT })
    return parseCredits(await creditsFetch(`/credits${qs}`), 'Failed to load credits')
  },
  async get(id: number): Promise<Credit> {
    return parseCredits(await creditsFetch(`/credits/${id}`), 'Failed to load the credit')
  },
  async update(id: number, body: CreditUpdate): Promise<Credit> {
    return parseCredits(await creditsFetch(`/credits/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), 'Failed to save the credit')
  },
  async approve(id: number): Promise<Credit> {
    return parseCredits(await creditsFetch(`/credits/${id}/approve`, { method: 'POST' }), 'Failed to approve')
  },
  async deny(id: number, reason: string | null): Promise<Credit> {
    return parseCredits(await creditsFetch(`/credits/${id}/deny`, { method: 'POST', body: JSON.stringify({ reason }) }), 'Failed to deny')
  },
  async poCost(id: number, refresh: boolean): Promise<PoCost> {
    return parseCredits(await creditsFetch(`/credits/${id}/po-cost${refresh ? '?refresh=true' : ''}`), 'PO cost lookup failed')
  },
  async setPoCost(id: number, body: { po_total_paid: number | null; po_notes: string | null }): Promise<Credit> {
    return parseCredits(await creditsFetch(`/credits/${id}/po-cost`, { method: 'PUT', body: JSON.stringify(body) }), 'Failed to save PO cost')
  },
  async send(id: number, body: SendCreditBody): Promise<SendResult> {
    return parseCredits(await creditsFetch(`/credits/${id}/send`, { method: 'POST', body: JSON.stringify(body) }), 'Send failed')
  },
  async events(id: number): Promise<AuditEvent[]> {
    return parseCredits(await creditsFetch(`/credits/${id}/events`), 'Failed to load history')
  },
  async emails(id: number): Promise<EmailLog[]> {
    return parseCredits(await creditsFetch(`/credits/${id}/emails`), 'Failed to load e-mails')
  },
  /** `null` on older backends without the endpoint. */
  async emailSettings(): Promise<EmailSettings | null> {
    const res = await creditsFetch('/settings/email')
    if (res.status === 404) return null
    return parseCredits(res, 'Failed to load e-mail settings')
  },
}

export function creditDocumentUrl(id: number, variant: DocVariant, fmt: DocFormat): string {
  return creditsUrl(`/credits/${id}/documents/${variant}/${fmt}`)
}

/** Rendered supplier e-mail (what "Send credit note" will send), optionally with the typed message. */
export function creditEmailPreviewUrl(id: number, language: EmailLanguage, message?: string): string {
  const q = new URLSearchParams({ lang: language })
  if (message?.trim()) q.set('message', message.trim())
  return creditsUrl(`/credits/${id}/email-preview?${q.toString()}`)
}

export function creditPhotoUrl(creditId: number, filename: string): string {
  return creditsUrl(`/photos/${creditId}/${encodeURIComponent(filename)}`)
}
