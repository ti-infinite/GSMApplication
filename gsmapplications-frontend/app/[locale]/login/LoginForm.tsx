'use client'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { login } from '@/app/lib/actions/auth'
import { useTenant } from '@/app/providers/TenantProvider'
import { TENANT_IDS } from '@/app/lib/tenants'
import { isSafeUrl } from '@/app/lib/utils'
import type { Locale } from '@/i18n/routing'

type Props = { locale: Locale }

export default function LoginForm({ locale }: Props) {
  const [state, action, pending] = useActionState(login, undefined)
  const t = useTranslations('login')
  const { companyId, branding, resolving, loadTenant } = useTenant()

  function switchLanguage(next: Locale) {
    if (next === locale) return
    // gsm_company cookie carries the tenant — no ?c= in the URL
    window.location.replace(`/${next}/login`)
  }

  function isTenantActive(prefix: string) {
    return companyId.toUpperCase().startsWith(prefix)
  }

  const TENANTS: { prefix: string; id: string; label: string }[] = [
    { prefix: 'IH', id: TENANT_IDS.en, label: 'Infinite Herbs' },
    { prefix: 'AG', id: TENANT_IDS.es, label: 'Agroaromas'     },
  ]

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">

      {/* ── Mobile top bar (hidden on desktop) ── */}
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
            <button
              key={prefix}
              type="button"
              onClick={() => loadTenant(id)}
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
            <button
              key={loc}
              type="button"
              onClick={() => switchLanguage(loc)}
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

      {/* ── Left panel ── */}
      <div className="flex w-full flex-col justify-center px-10 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('welcome')} {branding.name}
          </p>
          <h1 className="mb-1 text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mb-8 text-sm text-muted-foreground">{t('subtitle')}</p>

          <form action={action} className="flex flex-col gap-5">
            <input type="hidden" name="locale"     value={locale} />
            <input type="hidden" name="idCompany"  value={companyId} />

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user" className="text-sm font-medium text-foreground">
                {t('username')}
              </label>
              <input
                id="user" name="user" required autoComplete="username"
                placeholder={t('usernamePlaceholder')}
                className="rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('password')}
              </label>
              <input
                id="password" name="password" type="password" required autoComplete="current-password"
                placeholder={t('passwordPlaceholder')}
                className="rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                {t('rememberMe')}
              </label>
              <button type="button" className="text-sm text-primary hover:underline">
                {t('forgotPassword')}
              </button>
            </div>

            {state?.error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || resolving}
              className="mt-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending || resolving ? t('submitting') : t('submit')}
            </button>
          </form>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2 lg:flex-col">

        {/* Top-right: tenant switcher + language toggle */}
        <div className="absolute right-6 top-6 z-20 flex items-center gap-3">

          {/* Tenant buttons */}
          <div className="flex gap-1.5">
            {TENANTS.map(({ prefix, id, label }) => (
              <button
                key={prefix}
                type="button"
                onClick={() => loadTenant(id)}
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

          {/* Language buttons */}
          <div className="flex gap-1">
            {(['en', 'es'] as Locale[]).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => switchLanguage(loc)}
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

        {/* Centered branding */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl bg-primary-foreground/15 ring-2 ring-primary-foreground/30 backdrop-blur-sm">
            {branding.logo && isSafeUrl(branding.logo) ? (
              <img src={branding.logo} alt={branding.name} className="h-full w-full object-contain p-3" />
            ) : (
              <span className="text-4xl font-bold text-primary-foreground">{branding.initials}</span>
            )}
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground">
              {branding.name}
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/70">
              {branding.tagline?.[locale] ?? branding.tagline?.['en'] ?? t('tagline')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}