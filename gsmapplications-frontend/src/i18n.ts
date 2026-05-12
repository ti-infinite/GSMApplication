import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../messages/en.json'
import es from '../messages/es.json'

const SUPPORTED = ['en', 'es']
const pathLocale = window.location.pathname.split('/')[1]
const initialLng = SUPPORTED.includes(pathLocale) ? pathLocale : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
