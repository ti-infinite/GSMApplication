import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Base local del motor: gsm_engine, con stores separados por dominio.
interface EngineDB extends DBSchema {
  // Config de cada módulo (TRX + REA). key = configId (id del módulo).
  config_cache: {
    key:   string
    value: { configId: string; data: unknown; updatedAt: number }
  }
  // Data de cada resource. key = resourceId + params → una entrada por combinación.
  recursos_cache: {
    key:   string
    value: { resourceId: string; data: unknown; updatedAt: number }
  }
  // Pedidos confirmados (Requirements). key = consecutivo (PED-0001…).
  pedidos: {
    key:   string
    value: { consecutivo: string; data: unknown; updatedAt: number }
  }
  // Órdenes de compra generadas (Purchase Orders). key = numero (OC-0001…).
  ordenes: {
    key:   string
    value: { numero: string; data: unknown; updatedAt: number }
  }
  // Recepciones registradas (Recepción). key = numero de la orden (OC-0001…).
  recepciones: {
    key:   string
    value: { numero: string; data: unknown; updatedAt: number }
  }
  // Facturas guardadas (Facturas). key = numero (FAC-0001…).
  facturas: {
    key:   string
    value: { numero: string; data: unknown; updatedAt: number }
  }
}

const DB_NAME    = 'gsm_engine'
const DB_VERSION = 5

let dbPromise: Promise<IDBPDatabase<EngineDB>> | null = null

function getDb(): Promise<IDBPDatabase<EngineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EngineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('config_cache'))   db.createObjectStore('config_cache',   { keyPath: 'configId' })
        if (!db.objectStoreNames.contains('recursos_cache')) db.createObjectStore('recursos_cache', { keyPath: 'resourceId' })
        if (!db.objectStoreNames.contains('pedidos'))        db.createObjectStore('pedidos',        { keyPath: 'consecutivo' })
        if (!db.objectStoreNames.contains('ordenes'))        db.createObjectStore('ordenes',        { keyPath: 'numero' })
        if (!db.objectStoreNames.contains('recepciones'))    db.createObjectStore('recepciones',    { keyPath: 'numero' })
        if (!db.objectStoreNames.contains('facturas'))       db.createObjectStore('facturas',       { keyPath: 'numero' })
      },
    })
  }
  return dbPromise
}

// ── Data de resources (key = resourceId + params) ──────────────────
export async function saveResource(key: string, data: unknown): Promise<void> {
  const db = await getDb()
  await db.put('recursos_cache', { resourceId: key, data, updatedAt: Date.now() })
}
export async function getResource<T = unknown>(key: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('recursos_cache', key)
  return (rec?.data as T | undefined) ?? null
}
export async function invalidateResource(key: string): Promise<void> {
  const db = await getDb()
  await db.delete('recursos_cache', key)
}

// ── Config del módulo (key = configId) ─────────────────────────────
export async function saveConfig(configId: string, data: unknown): Promise<void> {
  const db = await getDb()
  await db.put('config_cache', { configId, data, updatedAt: Date.now() })
}
export async function getConfig<T = unknown>(configId: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('config_cache', configId)
  return (rec?.data as T | undefined) ?? null
}

// ── Pedidos confirmados (key = consecutivo) ────────────────────────
export async function savePedido(consecutivo: string, data: unknown): Promise<void> {
  const db = await getDb()
  await db.put('pedidos', { consecutivo, data, updatedAt: Date.now() })
}
export async function getPedido<T = unknown>(consecutivo: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('pedidos', consecutivo)
  return (rec?.data as T | undefined) ?? null
}
export async function listPedidos<T = unknown>(): Promise<T[]> {
  const db  = await getDb()
  const all = await db.getAll('pedidos')
  return all.map(r => r.data as T)
}

// ── Órdenes de compra (key = numero) ───────────────────────────────
export async function saveOrden(numero: string, data: unknown): Promise<void> {
  const db = await getDb()
  await db.put('ordenes', { numero, data, updatedAt: Date.now() })
}
export async function getOrden<T = unknown>(numero: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('ordenes', numero)
  return (rec?.data as T | undefined) ?? null
}
export async function listOrdenes<T = unknown>(): Promise<T[]> {
  const db  = await getDb()
  const all = await db.getAll('ordenes')
  return all.map(r => r.data as T)
}

// ── Recepciones (key = numero de la orden) ─────────────────────────
export async function saveRecepcion(numero: string, data: unknown): Promise<void> {
  const db = await getDb()
  await db.put('recepciones', { numero, data, updatedAt: Date.now() })
}
export async function getRecepcion<T = unknown>(numero: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('recepciones', numero)
  return (rec?.data as T | undefined) ?? null
}
export async function listRecepciones<T = unknown>(): Promise<T[]> {
  const db  = await getDb()
  const all = await db.getAll('recepciones')
  return all.map(r => r.data as T)
}

// ── Facturas (key = numero) ────────────────────────────────────────
export async function saveFactura(numero: string, data: unknown): Promise<void> {
  const db = await getDb()
  await db.put('facturas', { numero, data, updatedAt: Date.now() })
}
export async function getFactura<T = unknown>(numero: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('facturas', numero)
  return (rec?.data as T | undefined) ?? null
}
export async function listFacturas<T = unknown>(): Promise<T[]> {
  const db  = await getDb()
  const all = await db.getAll('facturas')
  return all.map(r => r.data as T)
}
