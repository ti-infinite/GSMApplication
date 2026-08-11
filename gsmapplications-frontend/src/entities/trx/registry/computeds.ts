// Computeds genéricos del motor — mismo patrón que DEFAULT_RENDERERS/DEFAULT_GUARDS/etc.
// (registry/index.ts los mergea, el módulo puede pisarlos si necesita algo distinto).
export const DEFAULT_COMPUTEDS: Record<string, (row: Record<string, unknown>) => unknown> = {
  // skuPrefix = AggregatedCode de la subcategoría (o categoría) ELEGIDA — el template lo declara
  // solo (`derive: [{ key:'skuPrefix', compute:'skuPrefix' }]`) apenas el módulo registra
  // CATEGORIES, así que TODO módulo con category/subcategory necesita esto para que esos combos
  // filtren algo (tabla principal Y "Cargar insumo", ambos leen `context.skuPrefix`) — antes cada
  // página lo redeclaraba a mano (y 4 de 7 módulos ni lo tenían → category/subcategory se veían
  // activos pero no filtraban nada).
  skuPrefix: ctx => {
    const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
    return (opts.subcategory ?? opts.category)?.AggregatedCode ?? ''
  },
}
