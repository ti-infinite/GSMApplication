import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { ChangePasswordForm } from '@/shared/components/ChangePasswordForm'
import { getStoredUser, logout } from '@/shared/lib/auth'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

const REDIRECT_SECONDS = 3

export default function SettingsPage() {
  const { t }              = useTranslation()
  const { locale = 'en' }  = useParams<{ locale: string }>()
  const navigate           = useNavigate()
  const [changed,   setChanged]   = useState(false)
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)
  const user = getStoredUser()

  useEffect(() => {
    if (!changed) return
    if (countdown === 0) {
      logout()
      navigate(`/${locale}/login`, { replace: true })
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [changed, countdown, locale, navigate])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {user && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">{t('profile.title')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">{t('profile.subtitle')}</p>
            <dl className="flex flex-col gap-3">
              {[
                { label: t('profile.fullName'),   value: user.fullName   },
                { label: t('profile.username'),   value: user.username   },
                { label: t('profile.email'),      value: user.email      },
                { label: t('profile.location'),   value: user.location   },
                { label: t('profile.department'), value: user.department },
                { label: t('profile.idProfile'),  value: String(user.idProfile) },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">{t('changePassword.title')}</h2>
          <ChangePasswordForm onSuccess={() => setChanged(true)} />
        </div>

      </div>

      <Dialog open={changed}>
        <DialogContent
          className="max-w-sm text-center"
          onInteractOutside={e => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <div>
              <p className="text-lg font-semibold text-foreground">{t('changePassword.successMessage')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('changePassword.redirectMessage', { seconds: countdown })}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => { logout(); navigate(`/${locale}/login`, { replace: true }) }}
            >
              {t('changePassword.loginNow')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}