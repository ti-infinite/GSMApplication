// Config del módulo (prototipo). `items` = columnas; el resource = de dónde sale la data.
import type { TrxItem, Resource } from '@/entities/trx'

export const REQUIREMENTS_ITEMS: TrxItem[] = [
  { descr: 'Variedad', selectorValue: 'varietyName' },
  { descr: 'Consumo',  selectorValue: 'consumption' },
  { descr: 'Restante', selectorValue: 'remaining' },
]

// El resource de datos (REA). En real, `sourceType: API` pega al backend por
// `process`; acá lo resuelve el fetcher mock. Los params (location + categoría)
// vienen del context → cambiar cualquiera re-fetchea con data distinta.
export const STOCK_RESOURCE: Resource = {
  id:         'LOADCS',
  descr:      'Stock inventory',
  sourceType: 'API',
  cacheIn:    'INDEXED_DB',
  parameters: [
    { key: 'location',    sourceType: 'CONTEXT', keyValue: 'location',    valueType: 'string' },
    { key: 'category',    sourceType: 'CONTEXT', keyValue: 'category',    valueType: 'string' },
    { key: 'subcategory', sourceType: 'CONTEXT', keyValue: 'subcategory', valueType: 'string' },
  ],
}
