import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import { SUPPORTED_LOCALES, type Locale } from '@/shared/hooks/useLocale'

function resolveInitialLocale(): Locale {
  const pathLocale = window.location.pathname.split('/')[1]
  if (SUPPORTED_LOCALES.includes(pathLocale as Locale)) return pathLocale as Locale
  const saved = localStorage.getItem('gsm_locale')
  if (SUPPORTED_LOCALES.includes(saved as Locale)) return saved as Locale
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: resolveInitialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n