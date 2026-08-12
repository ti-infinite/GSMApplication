import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'
import { login, isPasswordChangeRequired } from '@/shared/lib/auth'
import { AVAILABLE_TENANT_IDS, getBrandingFromCompanyId } from '@/shared/lib/tenants'
import { isSafeUrl } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useLocale, type Locale } from '@/shared/hooks/useLocale'
import { ChangePasswordForm } from '@/shared/components/ChangePasswordForm'

export default function LoginPage() {
  const { locale, switchLocale } = useLocale()
  const navigate = useNavigate()
  const { t }                    = useTranslation()
  const { companyId, branding, resolving, loadTenant } = useTenant()

  const [step,         setStep]        = useState<'login' | 'change-password'>('login')
  const [error,        setError]       = useState<string | null>(null)
  const [pending,      setPending]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const user     = form.get('user')     as string
    const password = form.get('password') as string

    setError(null)
    setPending(true)
    const result = await login({ companyId, user, password })
    setPending(false)

    if (result.success) {
      if (isPasswordChangeRequired()) {
        setStep('change-password')
      } else {
        navigate(`/${locale}/dashboard`, { replace: true, state: { fromLogin: true } })
      }
    } else {
      setError(result.error)
    }
  }

  function switchLanguage(next: Locale) {
    switchLocale(next, `/${next}/login`)
  }

  function isTenantActive(prefix: string) {
    return companyId.toUpperCase().startsWith(prefix)
  }

  const TENANTS = AVAILABLE_TENANT_IDS.map(id => ({
    id,
    prefix: id.substring(0, 2).toUpperCase(),
    label: getBrandingFromCompanyId(id).name,
  }))

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
            <Button key={prefix} type="button" size="sm" variant="ghost"
              onClick={() => loadTenant(id)}
              className={`text-xs ${
                isTenantActive(prefix)
                  ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                  : 'text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{prefix}</span>
            </Button>
          ))}
          <span className="h-4 w-px bg-primary-foreground/20" />
          {(['en', 'es'] as Locale[]).map((loc) => (
            <Button key={loc} type="button" size="sm" variant="ghost"
              onClick={() => switchLanguage(loc)}
              className={`rounded text-xs font-bold uppercase ${
                locale === loc
                  ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                  : 'text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground'
              }`}
            >
              {loc}
            </Button>
          ))}
        </div>
      </div>

      {/* Left panel */}
      <div className="flex w-full flex-col justify-center px-10 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
        {step === 'change-password' && (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('changePassword.forcedBadge')}
            </p>
            <h1 className="mb-1 text-3xl font-bold text-foreground">{t('changePassword.title')}</h1>
            <p className="mb-8 text-sm text-muted-foreground">{t('changePassword.forcedSubtitle')}</p>
            <ChangePasswordForm onSuccess={() => navigate(`/${locale}/dashboard`, { replace: true, state: { fromLogin: true } })} />
          </>
        )}
        {step === 'login' && (
          <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('login.welcome')} <span className="text-primary">{branding.name}</span>
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
              <div className="relative">
                <input
                  id="password" name="password" required autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full rounded-lg border border-border bg-input px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {t(error, { defaultValue: error })}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="mt-1 w-full"
            >
              {pending ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
          </>
        )}
        </div>
      </div>

      {/* Right panel */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2 lg:flex-col">
        <div className="absolute right-6 top-6 z-20 flex items-center gap-3">
          <div className="flex gap-1.5">
            {TENANTS.map(({ prefix, id, label }) => (
              <Button key={prefix} type="button" size="sm" variant="ghost"
                onClick={() => loadTenant(id)}
                className={`text-xs ${
                  isTenantActive(prefix)
                    ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                    : 'text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
          <span className="h-4 w-px bg-primary-foreground/20" />
          <div className="flex gap-1">
            {(['en', 'es'] as Locale[]).map((loc) => (
              <Button key={loc} type="button" size="sm" variant="ghost"
                onClick={() => switchLanguage(loc)}
                className={`rounded text-xs font-bold uppercase ${
                  locale === loc
                    ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                    : 'text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                }`}
              >
                {loc}
              </Button>
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
            <p className="mt-2 text-justify text-sm text-primary-foreground/70">
              {branding.tagline?.[locale] ?? branding.tagline?.['en'] ?? t('login.tagline')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}