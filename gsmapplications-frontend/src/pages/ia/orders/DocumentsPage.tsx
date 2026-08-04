import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Mail, Download, Search, ExternalLink, Calendar, Package, Loader2 } from 'lucide-react'
import { ihFetch } from '@/shared/lib/ihAgent'
import TablePagination from '@/shared/components/TablePagination'

const PAGE_SIZE = 100

interface S3Doc {
  key: string; name: string; size: number; lastModified: string
  type: 'pdf' | 'email' | 'csv'; bucket: string
}

async function getPresignedUrl(bucket: string, key: string): Promise<string> {
  const res = await ihFetch(`/api/documents/presign?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`)
  const data = await res.json()
  if (!data.url) throw new Error('No URL returned')
  return data.url
}

async function downloadDoc(bucket: string, key: string, name: string) {
  const url = await getPresignedUrl(bucket, key)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

async function openDoc(bucket: string, key: string) {
  const url = await getPresignedUrl(bucket, key)
  window.open(url, '_blank')
}

export default function DocumentsPage() {
  const { t } = useTranslation()
  const [docs, setDocs] = useState<S3Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'email' | 'csv'>('all')
  const [busy, setBusy] = useState<Record<string, 'download' | 'open' | null>>({})
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [filter, typeFilter])

  useEffect(() => {
    ihFetch('/api/documents')
      .then(r => r.json())
      .then(d => { setDocs(d.documents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = docs.filter(d => {
    const matchType = typeFilter === 'all' || d.type === typeFilter
    const matchText = !filter || d.name.toLowerCase().includes(filter.toLowerCase())
    return matchType && matchText
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagedDocs = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const rowStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rowEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const iconForType = (type: string) => {
    if (type === 'email') return <Mail className="w-5 h-5 text-blue-500" />
    if (type === 'pdf') return <FileText className="w-5 h-5 text-red-400" />
    return <Package className="w-5 h-5 text-[#434a98]" />
  }

  const bgForType = (type: string) => {
    if (type === 'email') return 'bg-blue-50'
    if (type === 'pdf') return 'bg-red-50'
    return 'bg-[#434a98]/5'
  }

  const handleDownload = async (doc: S3Doc) => {
    setBusy(b => ({ ...b, [doc.key + '_dl']: 'download' }))
    try { await downloadDoc(doc.bucket, doc.key, doc.name) }
    catch (e) { alert(`Download failed: ${e}`) }
    finally { setBusy(b => ({ ...b, [doc.key + '_dl']: null })) }
  }

  const handleOpen = async (doc: S3Doc) => {
    setBusy(b => ({ ...b, [doc.key + '_op']: 'open' }))
    try { await openDoc(doc.bucket, doc.key) }
    catch (e) { alert(`Could not open: ${e}`) }
    finally { setBusy(b => ({ ...b, [doc.key + '_op']: null })) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">{t('ia.documents.title')}</h1>
        <p className="text-sm text-gray-400 font-light mt-0.5">
          {t('ia.documents.subtitle')}
          {!loading && <span className="ml-2 text-gray-300">· {docs.length} {t('ia.documents.total')}</span>}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('ia.documents.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#434a98]/20 focus:border-[#434a98]" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'csv', 'pdf', 'email'] as const).map(typ => (
            <button key={typ} onClick={() => setTypeFilter(typ)}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-colors ${typeFilter === typ ? 'bg-[#434a98] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {typ === 'all' ? `${t('ia.documents.filterAll')} (${docs.length})` : `${typ.toUpperCase()} (${docs.filter(d => d.type === typ).length})`}
            </button>
          ))}
          {filtered.length > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              rowStart={rowStart}
              rowEnd={rowEnd}
              total={filtered.length}
              onPrev={() => setPage(p => Math.max(0, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-300 text-sm">{t('ia.documents.noDocuments')}</p>
          </div>
        ) : pagedDocs.map((doc) => (
          <div key={doc.key} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bgForType(doc.type)}`}>
              {iconForType(doc.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(doc.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-xs text-gray-400">{formatSize(doc.size)}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{doc.type.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleDownload(doc)}
                disabled={busy[doc.key + '_dl'] !== undefined && busy[doc.key + '_dl'] !== null}
                title={t('ia.documents.download')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {busy[doc.key + '_dl'] === 'download'
                  ? <Loader2 className="w-4 h-4 text-[#434a98] animate-spin" />
                  : <Download className="w-4 h-4 text-gray-400 hover:text-[#434a98]" />}
              </button>
              <button
                onClick={() => handleOpen(doc)}
                disabled={busy[doc.key + '_op'] !== undefined && busy[doc.key + '_op'] !== null}
                title={t('ia.documents.openNewTab')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {busy[doc.key + '_op'] === 'open'
                  ? <Loader2 className="w-4 h-4 text-[#434a98] animate-spin" />
                  : <ExternalLink className="w-4 h-4 text-gray-400 hover:text-[#434a98]" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
