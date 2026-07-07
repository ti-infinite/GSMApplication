import type { UseSkuBuilderResult } from '../model/useSkuBuilder'

/**
 * The "SKU generado" chips: category code + each chosen parameter code, then
 * the resolved SKU prefix. Renders a fragment (title + chips) — the consumer
 * owns the surrounding card so each feature keeps its own spacing.
 */
export function SkuChips({ sku, title, emptyLabel }: {
  sku:        UseSkuBuilderResult
  title:      string
  emptyLabel: string
}) {
  const chips: string[] = sku.effectiveCategory
    ? [
        sku.effectiveCategory.AggregatedCode,
        ...sku.rules.map(r => sku.selectedParams[r.IdParameter]?.code).filter(Boolean) as string[],
      ]
    : []

  return (
    <>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip, i) => (
            <span key={i} className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{chip}</span>
          ))}
          {chips.length < 1 + sku.rules.length && <span className="text-xs text-muted-foreground">...</span>}
          <span className="ml-2 text-base font-bold tracking-wider text-foreground">{sku.skuPrefix || '-'}</span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </>
  )
}
