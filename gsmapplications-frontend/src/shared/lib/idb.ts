import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Base local del motor: gsm_engine, con DOS stores separados.
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
}

const DB_NAME    = 'gsm_engine'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<EngineDB>> | null = null

function getDb(): Promise<IDBPDatabase<EngineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EngineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('config_cache'))   db.createObjectStore('config_cache',   { keyPath: 'configId' })
        if (!db.objectStoreNames.contains('recursos_cache')) db.createObjectStore('recursos_cache', { keyPath: 'resourceId' })
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
