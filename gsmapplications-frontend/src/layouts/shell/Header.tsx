import { Globe, Menu, Search, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/shared/hooks/useLocale'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu'

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
}

type Props = {
  locale:        string
  userName:      string
  onMenuToggle?: () => void
  onLogout:      () => void
}

export default function Header({ locale, userName, onMenuToggle, onLogout }: Props) {
  const { t } = useTranslation()
  const { switchLocale } = useLocale()

  function switchLanguage() {
    const next = locale === 'en' ? 'es' : 'en'
    switchLocale(next)
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-5">
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground sm:flex">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search or type command...</span>
      </div>

      <div className="flex-1 sm:hidden" />

      <button
        type="button"
        onClick={switchLanguage}
        className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 hover:border-primary/40"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{LANG_LABELS[locale]}</span>
        <span className="sm:hidden">{locale.toUpperCase()}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials || '?'}
            </div>
            <span className="hidden max-w-30 truncate font-medium text-foreground sm:block">
              {userName}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials || '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-semibold text-foreground">{userName}</span>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-primary focus:bg-primary/10 focus:text-primary"
            onSelect={onLogout}
          >
            <LogOut className="h-4 w-4" />
            {t('dashboard.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}