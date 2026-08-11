import { getCategories } from '@/shared/api/operations/endpoints'
import type { StringApiResponse } from '@/shared/api/operations/model'


export const categoriesFetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return { success: 'true' as const, message: '', data: cats, traceId: null }
}
