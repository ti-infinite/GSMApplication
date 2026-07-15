// Inventario compartido (IndexedDB: gsm_inventory) — simula el stock real por
// ubicación. Se SIEMBRA una sola vez por finca (getMasterProducts corre 1 vez);
// después solo se lee/actualiza (rápido). Todos los módulos operan sobre él:
//   · Ajustes  → setStock (corrección)   · Gasto → consume (descuento)
//   · Recepción→ receive  (ingreso)
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { getMasterProducts } from '@/shared/api/operations/endpoints'
import type { MasterProductDTOListApiResponse } from '@/shared/api/operations/model'

export interface StockItem { key: string; location: string; id: string; varietyName: string; qty: number; sku: string }

interface InvDB extends DBSchema {
  stock: { key: string; value: StockItem; indexes: { location: string } }
}

const seed = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
const K = (loc: string, id: string) => `${loc}|${id}`

let dbPromise: Promise<IDBPDatabase<InvDB>> | null = null
function db() {
  if (!dbPromise) {
    dbPromise = openDB<InvDB>('gsm_inventory', 1, {
      upgrade(d) {
        const s = d.createObjectStore('stock', { keyPath: 'key' })
        s.createIndex('location', 'location')
      },
    })
  }
  return dbPromise
}

// Siembra la ubicación una sola vez desde el catálogo (mock determinista por finca).
export async function ensureSeeded(location: string): Promise<void> {
  if (!location) return
  const d = await db()
  if ((await d.countFromIndex('stock', 'location', location)) > 0) return
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const tx = d.transaction('stock', 'readwrite')
  for (const p of all) for (const v of p.mv ?? []) {
    const id  = `${p.sku ?? ''}-${v.idVariety ?? 0}`
    const qty = Number(((seed(`${id}|${location}`) % 1000) / 10 + 5).toFixed(1))
    void tx.store.put({ key: K(location, id), location, id, varietyName: v.name ?? '', sku: p.sku ?? '', qty })
  }
  await tx.done
}

// Stock actual de una ubicación (opcionalmente filtrado por prefijo de sku).
export async function getStock(location: string, skuPrefix = ''): Promise<StockItem[]> {
  const d = await db()
  const rows = await d.getAllFromIndex('stock', 'location', location)
  return skuPrefix ? rows.filter(r => r.sku.startsWith(skuPrefix)) : rows
}

// Fija la cantidad (ajuste de inventario).
export async function setStock(location: string, id: string, qty: number): Promise<void> {
  const d = await db()
  const cur = await d.get('stock', K(location, id))
  if (cur) await d.put('stock', { ...cur, qty })
}

// Descuenta (consumo / gasto). No baja de 0.
export async function consume(location: string, items: Array<{ id: string; qty: number }>): Promise<void> {
  const d = await db()
  const tx = d.transaction('stock', 'readwrite')
  for (const it of items) {
    const cur = await tx.store.get(K(location, it.id))
    if (cur) void tx.store.put({ ...cur, qty: Math.max(0, cur.qty - Number(it.qty || 0)) })
  }
  await tx.done
}

// Ingresa/ajusta (recepción · ajuste). qty puede ser negativa (resta); no baja de 0.
export async function receive(location: string, items: Array<{ id: string; varietyName?: string; qty: number; sku?: string }>): Promise<void> {
  const d = await db()
  const tx = d.transaction('stock', 'readwrite')
  for (const it of items) {
    const cur = await tx.store.get(K(location, it.id))
    void tx.store.put({
      key: K(location, it.id), location, id: it.id,
      varietyName: it.varietyName ?? cur?.varietyName ?? it.id,
      sku: it.sku ?? cur?.sku ?? '',
      qty: Math.max(0, (cur?.qty ?? 0) + Number(it.qty || 0)),
    })
  }
  await tx.done
}
