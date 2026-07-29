import i18n from '@/app/i18n'
import { getTenantCurrency } from '@/shared/lib/tenant'

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return ''
  const locale = i18n.language || 'es'
  const currency = getTenantCurrency()
  try {
    return currency
      ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
      : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  } catch {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }
}
