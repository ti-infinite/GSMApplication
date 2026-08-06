import i18n from '@/app/i18n'
import { getTenantCurrency } from '@/shared/lib/tenant'

// El locale de UI (`i18n.language`) es "es"/"en" a secas (sin país) — para NÚMEROS eso importa:
// un "es" genérico posiciona el símbolo distinto (al final: "3000 $") y agrupa los miles de forma
// inconsistente ("3000" pero "240.000") comparado con un locale real como "es-CO" ("$ 3.000" los
// dos). Se arma el locale CON país para formatear, sin tocar el idioma de la UI en sí.
const NUMBER_LOCALE: Record<string, string> = { es: 'es-CO', en: 'en-US' }

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return ''
  const locale = NUMBER_LOCALE[i18n.language] ?? i18n.language ?? 'es-CO'
  const currency = getTenantCurrency()
  try {
    // `currencyDisplay: 'narrowSymbol'`: 'symbol' (el default) para monedas AMBIGUAS como COP
    // (varios países usan "$") resuelve al código ISO en un locale genérico ("es", no "es-CO")
    // para no confundir con USD/MXN/ARS — 'narrowSymbol' fuerza el símbolo corto ("$") siempre.
    return currency
      ? new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value)
      : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  } catch {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }
}
