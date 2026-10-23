import { grossMarginFetch, RelayError } from './ihAgent'

export function makeResourceClient<Row, CreateBody extends object, UpdateBody extends object>(
  resourcePath: string
) {
  return {
    async list(): Promise<Row[]> {
      const res = await grossMarginFetch(resourcePath)
      const body = await res.json()
      if (!res.ok) throw new RelayError(res.status, body?.detail ?? `Failed to load ${resourcePath}`)
      return body.rows as Row[]
    },
    async create(body: CreateBody) {
      const res = await grossMarginFetch(resourcePath, { method: 'POST', body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new RelayError(res.status, json?.detail ?? 'Failed to create row')
      return json
    },
    async update(id: number, body: UpdateBody) {
      const res = await grossMarginFetch(`${resourcePath}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new RelayError(res.status, json?.detail ?? 'Failed to update row')
      return json
    },
    async remove(id: number) {
      const res = await grossMarginFetch(`${resourcePath}/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new RelayError(res.status, json?.detail ?? 'Failed to delete row')
      return json
    },
  }
}