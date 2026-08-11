import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Base local del motor: gsm_engine. Stores PLANOS keyed por id + índice `module`
// para agrupar por módulo (no un store por proceso/módulo).
interface EngineDB extends DBSchema {
  // Definiciones (JsonConfig) de cada TRX. key = id del TRX; índice = module.
  trx_configs: {
    key:     string
    value:   { configId: string; module: string; data: unknown; updatedAt: number }
    indexes: { module: string }
  }
  // Data de cada resource. key = resourceId + params; índice = module.
  trx_data: {
    key:     string
    value:   { resourceId: string; module: string; data: unknown; updatedAt: number }
    indexes: { module: string }
  }
}

const DB_NAME    = 'gsm_engine'
const DB_VERSION = 7

let dbPromise: Promise<IDBPDatabase<EngineDB>> | null = null

function getDb(): Promise<IDBPDatabase<EngineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EngineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // v6: renombra config_cache/recursos_cache → trx_configs/trx_data + índice module.
        if (db.objectStoreNames.contains('config_cache'   as never)) db.deleteObjectStore('config_cache'   as never)
        if (db.objectStoreNames.contains('recursos_cache' as never)) db.deleteObjectStore('recursos_cache' as never)

        if (!db.objectStoreNames.contains('trx_configs')) {
          const s = db.createObjectStore('trx_configs', { keyPath: 'configId' })
          s.createIndex('module', 'module')
        }
        if (!db.objectStoreNames.contains('trx_data')) {
          const s = db.createObjectStore('trx_data', { keyPath: 'resourceId' })
          s.createIndex('module', 'module')
        }
        for (const store of ['pedidos', 'ordenes', 'recepciones', 'facturas'] as const) {
          if (db.objectStoreNames.contains(store as never)) db.deleteObjectStore(store as never)
        }
      },
    })
  }
  return dbPromise
}

// ── Data de resources (trx_data) — key = resourceId + params ───────
export async function saveResource(key: string, data: unknown, module = ''): Promise<void> {
  const db = await getDb()
  await db.put('trx_data', { resourceId: key, module, data, updatedAt: Date.now() })
}
export async function getResource<T = unknown>(key: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('trx_data', key)
  return (rec?.data as T | undefined) ?? null
}
export async function invalidateResource(key: string): Promise<void> {
  const db = await getDb()
  await db.delete('trx_data', key)
}
/** Invalida todas las variantes cacheadas de un resource (por prefijo del id). */
export async function clearResourcePrefix(prefix: string): Promise<void> {
  const db   = await getDb()
  const keys = await db.getAllKeys('trx_data')
  await Promise.all(keys.filter(k => String(k).startsWith(prefix)).map(k => db.delete('trx_data', k)))
}

// ── Definiciones de TRX (trx_configs) — key = configId ─────────────
export async function saveConfig(configId: string, data: unknown, module = ''): Promise<void> {
  const db = await getDb()
  await db.put('trx_configs', { configId, module, data, updatedAt: Date.now() })
}
export async function getConfig<T = unknown>(configId: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('trx_configs', configId)
  return (rec?.data as T | undefined) ?? null
}
/** Todos los TRX de un módulo (para prefetch / listado). */
export async function getConfigsByModule<T = unknown>(module: string): Promise<T[]> {
  const db  = await getDb()
  const all = await db.getAllFromIndex('trx_configs', 'module', module)
  return all.map(r => r.data as T)
}
/** Invalida (borra del cache) todo lo de un módulo: sus configs y su data. */
export async function invalidateModule(module: string): Promise<void> {
  const db = await getDb()
  for (const store of ['trx_configs', 'trx_data'] as const) {
    const keys = await db.getAllKeysFromIndex(store, 'module', module)
    await Promise.all(keys.map(k => db.delete(store, k)))
  }
}

