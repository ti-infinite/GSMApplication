import type { AuditEvent, EmailLog } from '@/entities/credit'
import { creditsFetch, creditsQuery, creditsUrl, parseCredits } from '@/shared/lib/ihCredits'
import type { PreAlert, PreAlertFilters, PreAlertList, PreAlertSendResult } from '../model/types'

// ih-credits pre-alerts (filed by QA in the quality app; reviewed here):
//   GET  /prealerts?status&whs&limit         -> PreAlertList
//   GET  /prealerts/{id}                     -> PreAlert
//   POST /prealerts/{id}/finalize?resend=true -> PreAlertSendResult (admin resend of the warehouse e-mail)
//   POST /prealerts/{id}/dismiss | /reopen   -> PreAlert
//   GET  /prealerts/{id}/emails | /events    -> EmailLog[] | AuditEvent[]
//   GET  /prealerts/{id}/email-preview       (rendered HTML)   GET /prealert-photos/{id}/{file}
const LIST_LIMIT = 500

export const prealertsApi = {
  async list(filters: PreAlertFilters = {}): Promise<PreAlertList> {
    const qs = creditsQuery({ status: filters.status, whs: filters.whs, limit: LIST_LIMIT })
    return parseCredits(await creditsFetch(`/prealerts${qs}`), 'Failed to load pre-alerts')
  },
  async get(id: number): Promise<PreAlert> {
    return parseCredits(await creditsFetch(`/prealerts/${id}`), 'Failed to load the pre-alert')
  },
  async resend(id: number): Promise<PreAlertSendResult> {
    return parseCredits(await creditsFetch(`/prealerts/${id}/finalize?resend=true`, { method: 'POST' }), 'Resend failed')
  },
  async dismiss(id: number): Promise<PreAlert> {
    return parseCredits(await creditsFetch(`/prealerts/${id}/dismiss`, { method: 'POST' }), 'Failed to dismiss')
  },
  async reopen(id: number): Promise<PreAlert> {
    return parseCredits(await creditsFetch(`/prealerts/${id}/reopen`, { method: 'POST' }), 'Failed to reopen')
  },
  async emails(id: number): Promise<EmailLog[]> {
    return parseCredits(await creditsFetch(`/prealerts/${id}/emails`), 'Failed to load e-mails')
  },
  async events(id: number): Promise<AuditEvent[]> {
    return parseCredits(await creditsFetch(`/prealerts/${id}/events`), 'Failed to load history')
  },
}

export function prealertPhotoUrl(prealertId: number, filename: string): string {
  return creditsUrl(`/prealert-photos/${prealertId}/${encodeURIComponent(filename)}`)
}

export function prealertEmailPreviewUrl(prealertId: number): string {
  return creditsUrl(`/prealerts/${prealertId}/email-preview`)
}
