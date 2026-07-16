import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react'
import { ihFetch } from '@/shared/lib/ihAgent'

interface UploadResult {
  file: string; status: 'uploading' | 'success' | 'error'; message?: string
  agentResult?: Record<string, unknown>
}

export default function UploadPage() {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setResults(prev => [...prev, { file: file.name, status: 'error', message: t('ia.upload.pdfOnly') }])
      return
    }
    const id = file.name
    setResults(prev => [...prev, { file: id, status: 'uploading' }])
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await ihFetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(prev => prev.map(r => r.file === id
        ? { ...r, status: 'success', message: data.warning || t('ia.upload.successDefault'), agentResult: data.agentResult }
        : r))
    } catch (err) {
      setResults(prev => prev.map(r => r.file === id ? { ...r, status: 'error', message: String(err) } : r))
    }
  }, [t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    Array.from(e.dataTransfer.files).forEach(processFile)
  }, [processFile])

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100dvh-8rem)] sm:min-h-0">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{t('ia.upload.title')}</h1>
        <p className="text-sm text-gray-400 font-light mt-0.5">{t('ia.upload.subtitle')}</p>
      </div>

      <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        className={`relative flex-1 border-2 border-dashed rounded-2xl p-8 sm:p-16 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
          ${dragging ? 'border-[#434a98] bg-[#434a98]/5' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'}`}>
        <input type="file" accept=".pdf" multiple onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(processFile) }}
          className="absolute inset-0 opacity-0 cursor-pointer" />
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-[#434a98]' : 'bg-gray-200'}`}>
          <Upload className={`w-8 h-8 ${dragging ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-gray-700">{dragging ? t('ia.upload.dropping') : t('ia.upload.dropzone')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('ia.upload.browse')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-2">
          {[
            { step: '1', label: t('ia.upload.steps.upload') },
            { step: '2', label: t('ia.upload.steps.extract') },
            { step: '3', label: t('ia.upload.steps.match') },
            { step: '4', label: t('ia.upload.steps.save') },
          ].map(({ step, label }) => (
            <div key={step} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#434a98]/10 flex items-center justify-center">
                <span className="text-xs font-medium text-[#434a98]">{step}</span>
              </div>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">{t('ia.upload.queue')}</h2>
            <button onClick={() => setResults([])} className="text-xs text-gray-400 hover:text-gray-600">{t('ia.upload.clearAll')}</button>
          </div>
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${r.status === 'success' ? 'bg-green-50 border-green-100' : r.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.file}</p>
                <p className={`text-xs mt-0.5 ${r.status === 'success' ? 'text-green-600' : r.status === 'error' ? 'text-red-500' : 'text-blue-600'}`}>
                  {r.status === 'uploading' ? t('ia.upload.uploading') : r.message}
                </p>
              </div>
              {r.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
              {r.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
              {r.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <button onClick={() => setResults(prev => prev.filter((_, j) => j !== i))}>
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
