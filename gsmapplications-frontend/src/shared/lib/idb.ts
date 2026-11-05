import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface EngineDB extends DBSchema {
  trx_configs: {
    key:     string
    value:   { configId: string; module: string; data: unknown }
    indexes: { module: string }
  }
  // Data de cada resource. key = resourceId + params; índice = module.
  trx_data: {
    key:     string
    value:   { resourceId: string; module: string; data: unknown }
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

// (IndexedDB es async). Se mantiene sincronizado en save/get/clear.
const memory = new Map<string, unknown>()

export function peekResource<T = unknown>(key: string): T | undefined {
  return memory.get(key) as T | undefined
}
export async function saveResource(key: string, data: unknown, module = ''): Promise<void> {
  memory.set(key, data)
  const db = await getDb()
  await db.put('trx_data', { resourceId: key, module, data })
}
export async function getResource<T = unknown>(key: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('trx_data', key)
  const data = (rec?.data as T | undefined) ?? null
  if (data != null) memory.set(key, data)
  return data
}
export async function clearResourcePrefix(prefix: string): Promise<void> {
  for (const k of [...memory.keys()]) if (k.startsWith(prefix)) memory.delete(k)
  const db   = await getDb()
  const keys = await db.getAllKeys('trx_data')
  await Promise.all(keys.filter(k => String(k).startsWith(prefix)).map(k => db.delete('trx_data', k)))
}

export async function saveConfig(configId: string, data: unknown, module = ''): Promise<void> {
  const db = await getDb()
  await db.put('trx_configs', { configId, module, data })
}
export async function getConfig<T = unknown>(configId: string): Promise<T | null> {
  const db  = await getDb()
  const rec = await db.get('trx_configs', configId)
  return (rec?.data as T | undefined) ?? null
}

