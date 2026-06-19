import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox } from '@/shared/ui/combobox'
import type { Category, MasterProduct, ProductVariety } from './types'
import type { useSkuBuilder } from './hooks/useSkuBuilder'

type SkuState = ReturnType<typeof useSkuBuilder>

/**
 * Product selector split into two pieces so the configurator can lay them out
 * in separate columns:
 *  - <ProductParams>  → the SKU builder fields (category → params). Compact combos.
 *  - <ProductResults> → matching products + variety + initial qty + SKU chips.
 */

/* ------------------------------ Params ------------------------------------ */
export function ProductParams({ categories, sku }: { categories: Category[]; sku: SkuState }) {
  const { t } = useTranslation()
  const selectedCatHasChildren =
    sku.selectedCategory?.Children && sku.selectedCategory.Children.length > 0

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{t('productivity.step1.category')}</label>
        <Combobox
          size="sm"
          options={categories.map(c => ({ value: String(c.IdCategory), label: c.Descr, badge: c.Code }))}
          value={String(sku.selectedCategory?.IdCategory ?? '')}
          onChange={val => {
            const cat = categories.find(c => String(c.IdCategory) === val) ?? null
            sku.selectCategory(cat)
          }}
          placeholder={t('productivity.step1.categoryPlaceholder')}
        />
      </div>

      {selectedCatHasChildren && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">{t('productivity.step1.subcategory')}</label>
          <Combobox
            size="sm"
            options={sku.selectedCategory!.Children!.map(c => ({ value: String(c.IdCategory), label: c.Descr, badge: c.Code }))}
            value={String(sku.selectedChildCategory?.IdCategory ?? '')}
            onChange={val => {
              const child = sku.selectedCategory!.Children!.find(c => String(c.IdCategory) === val) ?? null
              sku.selectChildCategory(child)
            }}
            placeholder={t('productivity.step1.subcategoryPlaceholder')}
          />
        </div>
      )}

      {sku.rules.map((rule, idx) => {
        const param   = sku.getParameter(rule)
        const enabled = sku.isParamEnabled(idx)
        const value   = sku.selectedParams[rule.IdParameter]?.code ?? ''
        return (
          <div key={rule.IdSKUTemplateRule} className="flex flex-col gap-1.5">
            <label className={`text-sm font-medium ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
              {rule.RuleName}
            </label>
            <Combobox
              size="sm"
              disabled={!enabled}
              options={(param?.paramAttributes ?? []).map(a => ({ value: a.code, label: a.shortName, badge: a.code }))}
              value={value}
              onChange={val => {
                const attr = param?.paramAttributes.find(a => a.code === val) ?? null
                sku.selectParam(rule.IdParameter, attr)
              }}
              placeholder={t('productivity.step1.selectParam', { name: rule.RuleName.toLowerCase() })}
            />
          </div>
        )
      })}
    </>
  )
}

/* ------------------------------ Results ----------------------------------- */
export function ProductResults({ sku }: { sku: SkuState }) {
  const { t } = useTranslation()
  const skuChips: string[] = sku.effectiveCategory
    ? [
        sku.effectiveCategory.AggregatedCode,
        ...sku.rules.map(r => sku.selectedParams[r.IdParameter]?.code).filter(Boolean) as string[],
      ]
    : []

  return (
    <>
      {sku.allParamsSelected ? (
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('productivity.step1.productsFound')}
            {sku.matchingProducts.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{sku.matchingProducts.length}</span>
            )}
          </p>
          {sku.matchingProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('productivity.step1.noProducts')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sku.selectedProduct && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <label className="shrink-0 text-sm font-medium text-foreground">
                    {t('productivity.step1.initialQty')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                    value={sku.initialQty ?? ''}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10)
                      sku.setInitialQty(isNaN(v) || v <= 0 ? null : v)
                    }}
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
                {sku.matchingProducts.map(product => (
                  <ProductCard
                    key={product.SKU}
                    product={product}
                    selected={sku.selectedProduct?.SKU === product.SKU}
                    selectedVariety={sku.selectedProduct?.SKU === product.SKU ? sku.selectedVariety : null}
                    onSelect={() => { sku.selectProduct(product); sku.selectVariety(null) }}
                    onSelectVariety={sku.selectVariety}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-8">
          <p className="text-sm text-muted-foreground">{t('productivity.step1.completeParams')}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('productivity.step1.skuGenerated')}</p>
        {skuChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {skuChips.map((chip, i) => (
              <span key={i} className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{chip}</span>
            ))}
            {skuChips.length < 1 + sku.rules.length && <span className="text-xs text-muted-foreground">...</span>}
            <span className="ml-2 text-base font-bold tracking-wider text-foreground">{sku.skuPrefix || '-'}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('productivity.step1.selectParamsForSku')}</p>
        )}
      </div>
    </>
  )
}

/* ------------------------------ ProductCard ------------------------------- */
function ProductCard({ product, selected, selectedVariety, onSelect, onSelectVariety }: {
  product: MasterProduct; selected: boolean; selectedVariety: ProductVariety | null
  onSelect: () => void; onSelectVariety: (v: ProductVariety | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation()

  return (
    <div className={`rounded-lg border transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/20">
        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-foreground">{product.MasterProductName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{product.SKU}</p>
        </div>
        <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{product.MeasurementUnitValue} {product.MeasurementUnit}</span>
      </button>

      {selected && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {product.MV.length > 1 ? t('productivity.step1.selectVarietyTitle') : t('productivity.step1.varietyTitle')}
          </p>
          <div className="flex flex-col gap-1.5">
            {product.MV.map(v => (
              <button key={v.IdVariety} type="button" onClick={() => onSelectVariety(v)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                  selectedVariety?.IdVariety === v.IdVariety
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:border-primary/40 text-foreground'
                }`}>
                <span className="flex-1">{v.Name}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">x{v.Qty}</span>
                {selectedVariety?.IdVariety === v.IdVariety && <CheckCircle2 className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selected && product.MV.length > 0 && (
        <>
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="flex w-full items-center gap-1.5 border-t border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/20">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t('productivity.step1.variety', { count: product.MV.length })}
          </button>
          {expanded && (
            <div className="flex flex-col gap-1 border-t border-border/50 px-3 pb-3 pt-2">
              {product.MV.map(v => (
                <div key={v.IdVariety} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{v.Name}</span><span>x{v.Qty}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
