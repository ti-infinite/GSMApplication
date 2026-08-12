// Computeds genéricos del motor — mismo patrón que DEFAULT_RENDERERS/DEFAULT_GUARDS/etc.
// (registry/index.ts los mergea, el módulo puede pisarlos si necesita algo distinto).
export const DEFAULT_COMPUTEDS: Record<string, (row: Record<string, unknown>) => unknown> = {
  // skuPrefix = AggregatedCode de la subcategoría (o categoría) elegida — lo necesita todo
  // módulo con CATEGORIES para que category/subcategory filtren algo (tabla y "Cargar insumo").
  skuPrefix: ctx => {
    const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
    return (opts.subcategory ?? opts.category)?.AggregatedCode ?? ''
  },
}
