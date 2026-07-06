import { useEffect } from 'react'
import { Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Combobox } from '@/shared/ui/combobox'
import { ProductParams, ProductResults } from './products/ProductPicker'
import { ConfiguredCard } from './products/ConfiguredCard'
import { WizardFooter } from '@/shared/ui/wizard-footer'
import type { AssignmentWizardConfig } from '../model/types'
import type { UseSkuBuilderResult } from '@/entities/product'
import type { useProductConfig } from '../model/useProductConfig'

type SkuState    = UseSkuBuilderResult
type ConfigState = ReturnType<typeof useProductConfig>

interface Props {
  data:   AssignmentWizardConfig
  sku:    SkuState
  config: ConfigState
  onNext: () => void
}

export function Step1Products({ data, sku, config, onNext }: Props) {
  const { t } = useTranslation()

  // Start with the first category pre-selected (saves a click). Never overrides
  // an existing selection — e.g. coming back from step 2 keeps what you had.
  useEffect(() => {
    if (data.categories.length > 0 && !sku.selectedCategory) {
      sku.selectCategory(data.categories[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.categories])

  const handleAdd = () => {
    if (!sku.selectedProduct || !sku.selectedVariety || !sku.initialQty) return
    config.addProduct({
      product:    sku.selectedProduct,
      variety:    sku.selectedVariety,
      skuPrefix:  sku.skuPrefix,
      defaultQty: sku.initialQty,
    })
    // Keep the search + product selected; clear only variety + qty so you can add
    // another variety of the same product (or another product) without redoing the SKU.
    sku.selectVariety(null)
    sku.setInitialQty(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/*  xl: 3 columns [Selección | Productos | Configurados]
           md: Selección on top (full width) + Productos | Configurados
           sm: everything stacked  */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[280px_minmax(0,1fr)_400px] xl:items-start">

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
          <ProductResults sku={sku} onAdd={handleAdd} />
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
