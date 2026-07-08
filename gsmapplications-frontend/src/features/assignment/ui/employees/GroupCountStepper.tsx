import { useTranslation } from 'react-i18next'

export function GroupCountStepper({ count, onChange }: { count: number; onChange: (n: number) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{t('productivity.step2.groupsLabel')}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(count - 1)} disabled={count <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted disabled:opacity-40">
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold text-foreground">{count}</span>
        <button type="button" onClick={() => onChange(count + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted">
          +
        </button>
      </div>
    </div>
  )
}
