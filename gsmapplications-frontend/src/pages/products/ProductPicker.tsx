import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SkuParamFields, SkuChips, VarietyList } from '@/entities/product'
import type { Category, MasterProduct, ProductVariety, UseSkuBuilderResult } from '@/entities/product'

type SkuState = UseSkuBuilderResult

interface Props {
  categories: Category[]
  sku:        SkuState
}

/**
 * Standalone product selector: category → subcategory → SKU parameters →
 * matching product → variety → initial qty. All selection rules and the
 * enable/disable cascade live in `useSkuBuilder` (reused, read-only, from the
 * productivity wizard) — this is purely the UI. Mirrors the wizard's Step 1.
 */
export function ProductPicker({ categories, sku }: Props) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm md:sticky md:top-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('products.step1.parameters')}</p>

        <SkuParamFields
          categories={categories}
          sku={sku}
          labels={{
            category:               t('products.step1.category'),
            categoryPlaceholder:    t('products.step1.categoryPlaceholder'),
            subcategory:            t('products.step1.subcategory'),
            subcategoryPlaceholder: t('products.step1.subcategoryPlaceholder'),
            param:                  name => t('products.step1.selectParam', { name }),
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        {sku.allParamsSelected ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('products.step1.productsFound')}
              {sku.matchingProducts.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{sku.matchingProducts.length}</span>
              )}
            </p>
            {sku.matchingProducts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t('products.step1.noProducts')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* InitialQTY — shown when a product is selected */}
                {sku.selectedProduct && (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5">
                    <label className="shrink-0 text-sm font-medium text-foreground">
                      {t('products.step1.initialQty')}
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
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-8">
            <p className="text-sm text-muted-foreground">{t('products.step1.completeParams')}</p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SkuChips
            sku={sku}
            title={t('products.step1.skuGenerated')}
            emptyLabel={t('products.step1.selectParamsForSku')}
          />
        </div>
      </div>
    </div>
  )
}

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
          <p className="text-sm font-medium text-foreground">{product.MasterProductName}</p>
          <p className="text-xs text-muted-foreground">{product.SKU}</p>
        </div>
        <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{product.MeasurementUnitValue} {product.MeasurementUnit}</span>
      </button>

      {selected && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2">
          <VarietyList
            title={product.MV.length > 1 ? t('products.step1.selectVarietyTitle') : t('products.step1.varietyTitle')}
            varieties={product.MV}
            selected={selectedVariety}
            onSelect={onSelectVariety}
          />
        </div>
      )}

      {!selected && product.MV.length > 0 && (
        <>
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="flex w-full items-center gap-1.5 border-t border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/20">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t('products.step1.variety', { count: product.MV.length })}
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