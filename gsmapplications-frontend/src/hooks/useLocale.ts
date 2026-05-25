import { useNavigate, useParams } from 'react-router-dom'
import i18n from '@/i18n'

export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

const STORAGE_KEY = 'gsm_locale'

export function isSupportedLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export function getSavedLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  return SUPPORTED_LOCALES.includes(saved as Locale) ? (saved as Locale) : 'en'
}

export function useLocale() {
  const { locale = 'en' } = useParams<{ locale: string }>()
  const navigate = useNavigate()

  async function switchLocale(next: Locale, basePath: string = '') {
    if (next === locale) return
    localStorage.setItem(STORAGE_KEY, next)
    await i18n.changeLanguage(next)
    const path = basePath || window.location.pathname.replace(`/${locale}/`, `/${next}/`)
    navigate(path, { replace: true })
  }

  return { locale: locale as Locale, switchLocale }
}
