// MOCK — simula el response del endpoint de datos, con la MISMA estructura real:
// envelope { success, message, data[], traceId }. La data varía por warehouse.
import type { ApiEnvelope } from '@/entities/trx'

export interface StockRow {
  idVariety:   number
  sku:         string
  varietyName: string   // en real se resuelve desde idVariety (catálogo / masterProducts)
  consumption: number
  remaining:   number
}

// Catálogo base de variedades. En real vendría de masterProducts filtrado por categoría.
const VARIETIES: Pick<StockRow, 'idVariety' | 'sku' | 'varietyName'>[] = [
  { idVariety: 1,  sku: 'MIFE000000001', varietyName: 'Menta Piperita' },
  { idVariety: 2,  sku: 'MIYE000000002', varietyName: 'Menta Yerbabuena' },
  { idVariety: 3,  sku: 'ALGE000000003', varietyName: 'Albahaca Genovesa' },
  { idVariety: 4,  sku: 'CILA000000004', varietyName: 'Cilantro' },
  { idVariety: 5,  sku: 'PECR000000005', varietyName: 'Perejil Crespo' },
  { idVariety: 6,  sku: 'ROME000000006', varietyName: 'Romero' },
  { idVariety: 7,  sku: 'TOMI000000007', varietyName: 'Tomillo' },
  { idVariety: 8,  sku: 'OREG000000008', varietyName: 'Orégano' },
  { idVariety: 9,  sku: 'SALV000000009', varietyName: 'Salvia' },
  { idVariety: 10, sku: 'ENEL000000010', varietyName: 'Eneldo' },
]

function seed(s: string): number {
  return [...s].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

// Genera 6–10 variedades DISTINTAS por (warehouse + categoría): rota el pool y
// varía consumo/restante según el seed. Estable por combinación → cambiar finca
// o categoría muestra otra data (para validar el switch).
export function stockFor(location: string, category = ''): ApiEnvelope<StockRow[]> {
  const base  = seed(`${location}|${category}`)
  const count = 6 + (base % 5)                 // 6..10 filas
  const start = base % VARIETIES.length         // rota el catálogo por combinación
  const pool  = [...VARIETIES.slice(start), ...VARIETIES.slice(0, start)]
  const data: StockRow[] = pool.slice(0, count).map((v, i) => ({
    ...v,
    consumption: Number((((base + i * 13) % 60) / 10).toFixed(2)),
    remaining:   Number((((base * (i + 2)) % 500) / 10).toFixed(2)),
  }))
  return { success: 'true', message: '', data, traceId: null }
}
