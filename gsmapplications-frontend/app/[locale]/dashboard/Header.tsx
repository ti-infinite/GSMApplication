'use client'
import { Globe, Menu, ChevronDown, Search } from 'lucide-react'
import type { Locale } from '@/i18n/routing'

const LANG_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
}

type Props = {
  locale: Locale
  userName: string
  onMenuToggle?: () => void
}

export default function Header({ locale, userName, onMenuToggle }: Props) {
  function switchLanguage() {
    const next: Locale = locale === 'en' ? 'es' : 'en'
    window.location.replace(`/${next}/dashboard`)
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-5">
      {/* Sidebar toggle */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search — hidden on mobile */}
      <div className="hidden flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground sm:flex">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search or type command...</span>
      </div>

      {/* Spacer on mobile so right-side buttons don't crowd left */}
      <div className="flex-1 sm:hidden" />

      {/* Language toggle — short code on mobile, full label on sm+ */}
      <button
        type="button"
        onClick={switchLanguage}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{LANG_LABELS[locale]}</span>
        <span className="sm:hidden">{locale.toUpperCase()}</span>
      </button>

      {/* User profile — avatar only on mobile, full row on sm+ */}
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials || '?'}
        </div>
        <span className="hidden max-w-[120px] truncate font-medium text-foreground sm:block">{userName}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      </button>
    </header>
  )
}
