import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { changePassword } from '@/shared/lib/auth'
import { Button } from '@/shared/ui/button'

type Props = {
  onSuccess: () => void
}

type Fields = {
  currentPassword: string
  newPassword:     string
  confirmPassword: string
}

type FieldErrors = Partial<Record<keyof Fields, string>>

function validate(fields: Fields, t: (k: string) => string): FieldErrors {
  const errors: FieldErrors = {}

  if (!fields.currentPassword)
    errors.currentPassword = t('changePassword.errors.currentRequired')

  if (!fields.newPassword)
    errors.newPassword = t('changePassword.errors.newRequired')
  else if (fields.newPassword.length < 8)
    errors.newPassword = t('changePassword.errors.minLength')
  else if (fields.newPassword === fields.currentPassword)
    errors.newPassword = t('changePassword.errors.sameAsCurrent')

  if (!fields.confirmPassword)
    errors.confirmPassword = t('changePassword.errors.confirmRequired')
  else if (fields.confirmPassword !== fields.newPassword)
    errors.confirmPassword = t('changePassword.errors.mismatch')

  return errors
}

export function ChangePasswordForm({ onSuccess }: Props) {
  const { t } = useTranslation()

  const [fields, setFields] = useState<Fields>({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  })
  const [showCurrent,  setShowCurrent]  = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({})
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [pending,      setPending]      = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.currentTarget
    setFields(prev => ({ ...prev, [name]: value }))
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate(fields, t)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setPending(true)
    const result = await changePassword(fields.currentPassword, fields.newPassword)
    setPending(false)

    if (!result.success) {
      setSubmitError(t(result.error))
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      <PasswordField
        id="currentPassword"
        label={t('changePassword.currentPassword')}
        show={showCurrent}
        onToggle={() => setShowCurrent(p => !p)}
        value={fields.currentPassword}
        onChange={handleChange}
        error={fieldErrors.currentPassword}
      />

      <PasswordField
        id="newPassword"
        label={t('changePassword.newPassword')}
        show={showNew}
        onToggle={() => setShowNew(p => !p)}
        value={fields.newPassword}
        onChange={handleChange}
        error={fieldErrors.newPassword}
      />

      <PasswordField
        id="confirmPassword"
        label={t('changePassword.confirmPassword')}
        show={showConfirm}
        onToggle={() => setShowConfirm(p => !p)}
        value={fields.confirmPassword}
        onChange={handleChange}
        error={fieldErrors.confirmPassword}
      />

      {submitError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? t('changePassword.submitting') : t('changePassword.submit')}
      </Button>
    </form>
  )
}

function PasswordField({
  id, label, show, onToggle, value, onChange, error,
}: {
  id:       keyof Fields
  label:    string
  show:     boolean
  onToggle: () => void
  value:    string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?:   string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
          className={`w-full rounded-lg border bg-input px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            error ? 'border-destructive' : 'border-border'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}