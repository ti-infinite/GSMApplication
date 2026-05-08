import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es'] as const,
  defaultLocale: 'en' as const,
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
