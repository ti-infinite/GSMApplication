import { useState, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/providers/TenantProvider'
import { login } from '@/lib/auth'
import { TENANT_IDS } from '@/lib/tenants'
import { isSafeUrl } from '@/lib/utils'

type Locale = 'en' | 'es'

export default function LoginPage() {
  const { locale = 'en' } = useParams<{ locale: string }>()
  const navigate           = useNavigate()
  const { t }              = useTranslation()
  const { companyId, branding, resolving, loadTenant } = useTenant()

  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const user     = form.get('user')     as string
    const password = form.get('password') as string

    setError(null)
    setPending(true)
    const result = await login(companyId, user, password)
    setPending(false)

    if (result.success) {
      navigate(`/${locale}/dashboard`, { replace: true, state: { fromLogin: true } })
    } else {
      setError(result.error)
    }
  }

  function switchLanguage(next: Locale) {
    if (next === locale) return
    window.location.replace(`/${next}/login`)
  }

  function isTenantActive(prefix: string) {
    return companyId.toUpperCase().startsWith(prefix)
  }

  const TENANTS = [
    { prefix: 'IH', id: TENANT_IDS.en, label: 'Infinite Herbs' },
    { prefix: 'AG', id: TENANT_IDS.es, label: 'Agroaromas' },
  ]

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">

      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-primary px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-foreground/15">
            {branding.logo && isSafeUrl(branding.logo) ? (
              <img src={branding.logo} alt={branding.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs font-bold text-primary-foreground">{branding.initials}</span>
            )}
          </div>
          <span className="truncate text-sm font-semibold text-primary-foreground">{branding.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-3">
          {TENANTS.map(({ prefix, id, label }) => (
            <button key={prefix} type="button" onClick={() => loadTenant(id)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                isTenantActive(prefix)
                  ? 'bg-primary-foreground text-primary'
                  : 'text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{prefix}</span>
            </button>
          ))}
          <span className="h-4 w-px bg-primary-foreground/20" />
          {(['en', 'es'] as Locale[]).map((loc) => (
            <button key={loc} type="button" onClick={() => switchLanguage(loc)}
              className={`rounded px-2 py-1 text-xs font-bold uppercase transition-colors ${
                locale === loc
                  ? 'bg-primary-foreground text-primary'
                  : 'text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Left panel */}
      <div className="flex w-full flex-col justify-center px-10 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('login.welcome')} {branding.name}
          </p>
          <h1 className="mb-1 text-3xl font-bold text-foreground">{t('login.title')}</h1>
          <p className="mb-8 text-sm text-muted-foreground">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user" className="text-sm font-medium text-foreground">
                {t('login.username')}
              </label>
              <input
                id="user" name="user" required autoComplete="username"
                placeholder={t('login.usernamePlaceholder')}
                className="rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('login.password')}
              </label>
              <input
                id="password" name="password" type="password" required autoComplete="current-password"
                placeholder={t('login.passwordPlaceholder')}
                className="rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                {t('login.rememberMe')}
              </label>
              <button type="button" className="text-sm text-primary hover:underline">
                {t('login.forgotPassword')}
              </button>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || resolving}
              className="mt-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending || resolving ? t('login.submitting') : t('login.submit')}
            </button>
          </form>
        </div>
      </div>

      {/* â”€â”€ Right panel â”€â”€ */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2 lg:flex-col">
        <div className="absolute right-6 top-6 z-20 flex items-center gap-3">
          <div className="flex gap-1.5">
            {TENANTS.map(({ prefix, id, label }) => (
              <button key={prefix} type="button" onClick={() => loadTenant(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isTenantActive(prefix)
                    ? 'bg-primary-foreground text-primary'
                    : 'text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="h-4 w-px bg-primary-foreground/20" />
          <div className="flex gap-1">
            {(['en', 'es'] as Locale[]).map((loc) => (
              <button key={loc} type="button" onClick={() => switchLanguage(loc)}
                className={`rounded px-2 py-1 text-xs font-bold uppercase transition-colors ${
                  locale === loc
                    ? 'bg-primary-foreground text-primary'
                    : 'text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl bg-primary-foreground/15 ring-2 ring-primary-foreground/30 backdrop-blur-sm">
            {branding.logo && isSafeUrl(branding.logo) ? (
              <img src={branding.logo} alt={branding.name} className="h-full w-full object-contain p-3" />
            ) : (
              <span className="text-4xl font-bold text-primary-foreground">{branding.initials}</span>
            )}
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground">{branding.name}</h2>
            <p className="mt-2 text-sm text-primary-foreground/70">
              {branding.tagline?.[locale] ?? branding.tagline?.['en'] ?? t('login.tagline')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
