import { useTranslation } from 'react-i18next'
import { X, Trash2, AlertCircle } from 'lucide-react'
import { Combobox } from '@/shared/ui/combobox'
import type { AssignmentWizardConfig, ConfiguredProduct } from '../../model/types'
import type { useProductConfig } from '../../model/useProductConfig'

type ConfigState = ReturnType<typeof useProductConfig>

// A configured product in the step-1 "cart": its grower(s) + ITC per grower.
export function ConfiguredCard({ cp, growers, config }: {
  cp:      ConfiguredProduct
  growers: AssignmentWizardConfig['growers']
  config:  ConfigState
}) {
  const { t } = useTranslation()

  const availableGrowers = growers.filter(g => !cp.growers.some(sg => sg.grower.id === g.id))
  const noGrowers   = cp.growers.length === 0
  const missingItc  = cp.growers.some(g => !g.itc.trim())
  const incomplete  = noGrowers || missingItc

  return (
    <div className={`flex flex-col gap-2.5 rounded-lg border bg-card p-3 ${incomplete ? 'border-amber-500/40' : 'border-border'}`}>
      {/* Header: product + remove (qty lives in step 2's mesa card) */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">{cp.product.MasterProductName}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground"><span className="font-mono">{cp.product.SKU}</span></p>
        </div>
        <button
          type="button"
          onClick={() => config.removeProduct(cp.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Growers */}
      <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-muted/10 p-2">
        <Combobox
          size="sm"
          options={availableGrowers.map(g => ({ value: g.id, label: g.name, description: g.country, badge: g.country }))}
          value=""
          onChange={val => {
            const g = growers.find(x => x.id === val)
            if (g) config.addGrower(cp.id, g)
          }}
          placeholder={t('productivity.step1.addGrower')}
          emptyMessage={t('productivity.step3.noResults')}
        />

        {cp.growers.map(sg => (
          <div key={sg.grower.id} className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{sg.grower.name}</p>
              {sg.grower.country && <p className="truncate text-[10px] text-muted-foreground">{sg.grower.country}</p>}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={sg.itc}
              onChange={e => config.setGrowerItc(cp.id, sg.grower.id, e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={t('productivity.step1.itc')}
              className={`w-16 min-w-0 shrink-0 rounded border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring ${
                sg.itc.trim() ? 'border-border' : 'border-amber-500/50'
              }`}
            />
            <button
              type="button"
              onClick={() => config.removeGrower(cp.id, sg.grower.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {incomplete && (
          <p className="flex items-center gap-1.5 px-0.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {noGrowers ? t('productivity.step1.hintAddGrower') : t('productivity.step1.hintGrowerItc')}
          </p>
        )}
      </div>
    </div>
  )
}
