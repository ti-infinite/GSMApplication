import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { ChangePasswordForm } from '@/shared/components/ChangePasswordForm'
import { getStoredUser } from '@/shared/lib/auth'

export default function SettingsPage() {
  const { t } = useTranslation()
  const [changed, setChanged] = useState(false)
  const user = getStoredUser()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {user && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
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

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t('changePassword.title')}</h2>

        {changed ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-foreground">{t('changePassword.successMessage')}</p>
          </div>
        ) : (
          <ChangePasswordForm onSuccess={() => setChanged(true)} />
        )}
      </div>
    </div>
  )
}