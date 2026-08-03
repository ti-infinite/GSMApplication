import { ihFetch } from '@/shared/lib/ihAgent'

/**
 * Objects in `ih-agent-documents` / `ih-agent-uploads` are private. Never build a
 * URL by hand — mint a presigned one through the backend, on click, never at render
 * (they expire after ~1 hour).
 */
export async function getPresignedUrl(bucket: string, key: string): Promise<string> {
  const res = await ihFetch(`/api/documents/presign?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`)
  const data = await res.json()
  if (!data.url) throw new Error('No URL returned')
  return data.url
}

export async function downloadDoc(bucket: string, key: string, name: string) {
  const url = await getPresignedUrl(bucket, key)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  // Presigned URLs are cross-origin, so the browser ignores `download` and would
  // otherwise navigate the current tab (losing the chat). Open in a new tab instead.
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
}

export async function openDoc(bucket: string, key: string) {
  const url = await getPresignedUrl(bucket, key)
  window.open(url, '_blank')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
