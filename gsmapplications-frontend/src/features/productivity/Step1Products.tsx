import { Plus, X, Trash2, Package, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { ProductParams, ProductResults } from './ProductPicker'
import { WizardFooter } from './WizardFooter'
import type { AssignmentWizardConfig, ConfiguredProduct } from './types'
import type { useSkuBuilder } from './hooks/useSkuBuilder'
import type { useProductConfig } from './hooks/useProductConfig'

type SkuState    = ReturnType<typeof useSkuBuilder>
type ConfigState = ReturnType<typeof useProductConfig>

interface Props {
  data:   AssignmentWizardConfig
  sku:    SkuState
  config: ConfigState
  onNext: () => void
}

export function Step1Products({ data, sku, config, onNext }: Props) {
  const { t } = useTranslation()

  const handleAdd = () => {
    if (!sku.selectedProduct || !sku.selectedVariety || !sku.initialQty) return
    config.addProduct({
      product:    sku.selectedProduct,
      variety:    sku.selectedVariety,
      skuPrefix:  sku.skuPrefix,
      defaultQty: sku.initialQty,
    })
    sku.reset()
    sku.setInitialQty(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/*  xl: 3 columns [Selección | Productos | Configurados]
           md: Selección on top (full width) + Productos | Configurados
           sm: everything stacked  */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[300px_minmax(0,1fr)_360px] xl:items-start">

        {/* ── Col 1 · Selección ── */}
        <div className="md:col-span-2 xl:col-span-1 xl:sticky xl:top-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('productivity.step1.parameters')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">{t('productivity.step1.productionType')}</label>
                <Combobox
                  size="sm"
                  options={data.productionTypes.map(pt => ({ value: pt.code, label: pt.shortName, badge: pt.code }))}
                  value={config.productionType}
                  onChange={config.setProductionType}
                  placeholder={t('productivity.step1.selectType')}
                />
              </div>
              <ProductParams categories={data.categories} sku={sku} />
            </div>
          </div>
        </div>

        {/* ── Col 2 · Productos y variedades ── */}
        <div className="flex flex-col gap-4">
          <ProductResults sku={sku} />
          <div className="flex">
            <Button onClick={handleAdd} disabled={!sku.isComplete} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              {t('productivity.step1.addProduct')}
            </Button>
          </div>
        </div>

        {/* ── Col 3 · Configurados (carrito) ── */}
        <div className="xl:sticky xl:top-4">
          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('productivity.step1.configuredProducts')}
              {config.products.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{config.products.length}</span>
              )}
            </p>

            {config.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="px-4 text-xs text-muted-foreground">{t('productivity.step1.noProductsYet')}</p>
              </div>
            ) : (
              <div className="flex max-h-160 flex-col gap-2.5 overflow-y-auto scrollbar-hide">
                {config.products.map(cp => (
                  <ConfiguredCard key={cp.id} cp={cp} growers={data.growers} config={config} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <WizardFooter
        hint={
          config.isComplete ? null : (
            <span className="text-sm text-muted-foreground">{t('productivity.step1.hintConfigureProduct')}</span>
          )
        }
        primaryLabel={t('productivity.step1.next')}
        onPrimary={onNext}
        primaryDisabled={!config.isComplete}
      />
    </div>
  )
}

function ConfiguredCard({ cp, growers, config }: {
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
          <p className="truncate text-sm font-semibold text-foreground">{cp.product.MasterProductName}</p>
          <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{cp.product.SKU}</span></p>
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
