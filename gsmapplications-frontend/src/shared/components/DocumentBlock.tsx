import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Presentation, Sheet, Download, Loader2 } from 'lucide-react'
import { downloadDoc, formatFileSize } from '@/shared/lib/ihDocuments'

export interface DocumentData {
  filename: string
  format: 'pdf' | 'pptx' | 'xlsx'
  content_type: string
  size: number
  bucket: string
  key: string
}

function iconFor(format: DocumentData['format']) {
  if (format === 'pptx') return <Presentation className="w-5 h-5 text-[#E8A80C]" />
  if (format === 'xlsx') return <Sheet className="w-5 h-5 text-green-600" />
  return <FileText className="w-5 h-5 text-red-400" />
}

function bgFor(format: DocumentData['format']) {
  if (format === 'pptx') return 'bg-[#E8A80C]/10'
  if (format === 'xlsx') return 'bg-green-50'
  return 'bg-red-50'
}

export default function DocumentBlock({ document }: { document: DocumentData }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    if (busy) return
    setBusy(true)
    // Presigned URLs expire in ~1h, so mint one on click, never at render.
    try { await downloadDoc(document.bucket, document.key, document.filename) }
    catch (e) { alert(String(e)) }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bgFor(document.format)}`}>
        {iconFor(document.format)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{document.filename}</p>
        <span className="text-xs text-gray-400">
          {document.format.toUpperCase()} · {formatFileSize(document.size)}
        </span>
      </div>
      <button
        onClick={handleDownload}
        disabled={busy}
        title={t('common.download')}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#434a98] text-white rounded-xl text-xs font-medium hover:bg-[#3b4189] transition-colors disabled:opacity-50 shrink-0"
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{t('common.download')}</span>
      </button>
    </div>
  )
}
