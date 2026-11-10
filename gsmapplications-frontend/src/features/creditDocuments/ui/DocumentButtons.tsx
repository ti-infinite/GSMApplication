import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, FileText, Lock } from 'lucide-react'
import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { creditDocumentUrl, type Credit, type DocFormat, type DocVariant } from '@/entities/credit'

// Supplier version (no yield) and Internal version (everything, for tracking), each as Excel
// and PDF. Plain same-origin links: the session cookie authenticates the download.
export function DocumentButtons({ credit }: { credit: Credit }) {
  const { t } = useTranslation()
  const locked = credit.status !== 'approved'
  const link = (variant: DocVariant, fmt: DocFormat) => (
    <a
      key={`${variant}-${fmt}`}
      href={locked ? undefined : creditDocumentUrl(credit.id, variant, fmt)}
      aria-disabled={locked}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), locked && 'pointer-events-none opacity-50')}
    >
      {fmt === 'xlsx' ? <FileSpreadsheet className="text-success" /> : <FileText className="text-destructive" />}
      {t(`credits.docs.${fmt}`)}
    </a>
  )
  return (
    <div className="flex flex-col gap-3">
      {locked && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> {t('credits.docs.locked')}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(['supplier', 'internal'] as const).map((variant) => (
          <div key={variant} className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">{t(`credits.docs.${variant}`)}</p>
            <div className="flex flex-wrap gap-2">{link(variant, 'xlsx')}{link(variant, 'pdf')}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('credits.docs.hint')}</p>
    </div>
  )
}
