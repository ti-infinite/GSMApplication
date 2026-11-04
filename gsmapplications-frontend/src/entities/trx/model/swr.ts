/**
 * Stale-while-revalidate sobre IndexedDB: si hay cache lo devuelve YA y revalida en
 * background (`onFresh` recibe lo nuevo, `onError` si falla); si no hay, espera al fetch.
 * Lo fresco siempre se guarda antes de entregarse. Sin `onFresh` no revalida: nadie lo leería.
 */
export async function staleWhileRevalidate<T>({ read, fetch, save, onFresh, onError }: {
  read:     () => Promise<T | null>
  fetch:    () => Promise<T>
  save:     (data: T) => Promise<void>
  onFresh?: (data: T) => void
  onError?: (err: unknown) => void
}): Promise<T> {
  const fetchAndSave = async () => {
    const fresh = await fetch()
    await save(fresh)
    return fresh
  }

  const cached = await read()
  if (cached != null) {
    if (onFresh) void fetchAndSave().then(onFresh).catch(err => onError?.(err))
    return cached
  }
  return fetchAndSave()
}
