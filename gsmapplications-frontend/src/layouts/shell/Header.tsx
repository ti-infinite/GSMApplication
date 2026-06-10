import { Globe, LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/shared/hooks/useLocale'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu'
import { Avatar } from '@/shared/ui/avatar'

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
}

type Props = {
  locale:        string
  userName:      string
  menuOpen?:     boolean
  onMenuToggle?: () => void
  onLogout:      () => void
}

export default function Header({ locale, userName, menuOpen = false, onMenuToggle, onLogout }: Props) {
  const { t } = useTranslation()
  const { switchLocale } = useLocale()
  const navigate = useNavigate()

  function switchLanguage() {
    const next = locale === 'en' ? 'es' : 'en'
    switchLocale(next)
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-5">
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label={t('dashboard.toggleMenu', { defaultValue: 'Toggle menu' })}
        aria-expanded={menuOpen}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span className="relative block h-4 w-5">
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
              menuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'
            }`}
          />
          <span
            className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-all duration-200 ease-in-out ${
              menuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
              menuOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'
            }`}
          />
        </span>
      </button>

      <div className="flex-1" />

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
            <Avatar name={userName} online size="sm" />
            <span className="hidden max-w-30 truncate font-medium text-foreground sm:block">
              {userName}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name={userName} online size="md" ringClass="ring-popover" />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-semibold text-foreground">{userName}</span>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => navigate(`/${locale}/dashboard/settings`)}>
            <Settings className="h-4 w-4" />
            {t('settings.title')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
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