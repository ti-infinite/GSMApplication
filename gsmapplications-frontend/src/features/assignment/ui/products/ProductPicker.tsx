import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { SkuParamFields, SkuChips, VarietyList } from '@/entities/product'
import type { Category, MasterProduct, ProductVariety, UseSkuBuilderResult } from '@/entities/product'

type SkuState = UseSkuBuilderResult

/**
 * Product selector split into two pieces so the configurator can lay them out
 * in separate columns:
 *  - <ProductParams>  → the SKU builder fields (category → params). Compact combos.
 *  - <ProductResults> → matching products + variety + initial qty + SKU chips.
 */

/* ------------------------------ Params ------------------------------------ */
export function ProductParams({ categories, sku }: { categories: Category[]; sku: SkuState }) {
  const { t } = useTranslation()
  return (
    <SkuParamFields
      categories={categories}
      sku={sku}
      size="sm"
      labels={{
        category:               t('productivity.step1.category'),
        categoryPlaceholder:    t('productivity.step1.categoryPlaceholder'),
        subcategory:            t('productivity.step1.subcategory'),
        subcategoryPlaceholder: t('productivity.step1.subcategoryPlaceholder'),
        param:                  name => t('productivity.step1.selectParam', { name }),
      }}
    />
  )
}

/* ------------------------------ Results ----------------------------------- */
export function ProductResults({ sku, onAdd }: { sku: SkuState; onAdd: () => void }) {
  const { t } = useTranslation()

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
            <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
              {sku.matchingProducts.map(product => (
                <ProductCard
                  key={product.SKU}
                  product={product}
                  selected={sku.selectedProduct?.SKU === product.SKU}
                  selectedVariety={sku.selectedProduct?.SKU === product.SKU ? sku.selectedVariety : null}
                  qty={sku.selectedProduct?.SKU === product.SKU ? sku.initialQty : null}
                  onSelect={() => { sku.selectProduct(product); sku.selectVariety(null) }}
                  onSelectVariety={sku.selectVariety}
                  onQty={sku.setInitialQty}
                  onAdd={onAdd}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-8">
          <p className="text-sm text-muted-foreground">{t('productivity.step1.completeParams')}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <SkuChips
          sku={sku}
          title={t('productivity.step1.skuGenerated')}
          emptyLabel={t('productivity.step1.selectParamsForSku')}
        />
      </div>
    </>
  )
}

/* ------------------------------ ProductCard ------------------------------- */
function ProductCard({ product, selected, selectedVariety, qty, onSelect, onSelectVariety, onQty, onAdd }: {
  product: MasterProduct; selected: boolean; selectedVariety: ProductVariety | null; qty: number | null
  onSelect: () => void; onSelectVariety: (v: ProductVariety | null) => void
  onQty: (n: number | null) => void; onAdd: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation()
  const canAdd = !!selectedVariety && qty != null && qty > 0

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
          <VarietyList
            title={product.MV.length > 1 ? t('productivity.step1.selectVarietyTitle') : t('productivity.step1.varietyTitle')}
            varieties={product.MV}
            selected={selectedVariety}
            onSelect={onSelectVariety}
          />

          {/* Cantidad + agregar — inline, en la misma card (cero scroll) */}
          <div className="mt-2.5 flex items-center gap-2 border-t border-border/60 pt-2.5">
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={qty ?? ''}
              onChange={e => {
                const n = parseInt(e.target.value, 10)
                onQty(isNaN(n) || n <= 0 ? null : n)
              }}
              onKeyDown={e => { if (e.key === 'Enter' && canAdd) onAdd() }}
              placeholder={t('productivity.step1.initialQty')}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="button"
              size="icon"
              onClick={onAdd}
              disabled={!canAdd}
              className="shrink-0"
              aria-label={t('productivity.step1.addProduct')}
              title={t('productivity.step1.addProduct')}
            >
              <Plus />
            </Button>
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
