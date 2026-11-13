import i18n from '@/app/i18n'
import { getTenantCurrency } from '@/shared/lib/tenant'

const NUMBER_LOCALE: Record<string, string> = { es: 'es-CO', en: 'en-US' }

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return ''
  const locale = NUMBER_LOCALE[i18n.language] ?? i18n.language ?? 'es-CO'
  const currency = getTenantCurrency()
  try {
    return currency
      ? new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value)
      : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  } catch {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }
}
