import { AlertTriangle, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errorTypeToKey, type ApiError } from '@/shared/lib/errorType'

type Props = {
  /** Error thrown by the fetcher / React Query (may carry `errorType`). */
  error?: unknown
  /** Retry handler — typically the query's `refetch`. */
  onRetry?: () => void
  className?: string
}

/**
 * Reusable error UI for failed data loads. It maps the backend `errorType` to a
 * friendly, translated message and never surfaces the raw backend `message`
 * (which may carry technical detail), keeping errors safe and consistent.
 */
export function ErrorState({ error, onRetry, className = '' }: Props) {
  const { t } = useTranslation()
  const errorType = (error as ApiError | undefined)?.errorType
  const message = t(errorTypeToKey(errorType))

  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 text-center ${className}`}>
      <AlertTriangle className="h-10 w-10 text-destructive/60" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{t('errors.loadTitle')}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/20"
        >
          <RotateCw className="h-4 w-4" />
          {t('errors.retry')}
        </button>
      )}
    </div>
  )
}