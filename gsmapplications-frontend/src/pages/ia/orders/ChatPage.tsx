import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ihFetch } from '@/shared/lib/ihAgent'
import { Send, Bot, User, Loader2, Sparkles, CheckCircle2, XCircle, Paperclip, X, FileText, Image as ImageIcon, File, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import ChartBlock, { type VisualizationData } from '@/shared/components/ChartBlock'
import DocumentBlock, { type DocumentData } from '@/shared/components/DocumentBlock'

const UPLOADS_ENDPOINT = '/api/uploads'
const CHAT_ENDPOINT = '/api/chat'
const ACCEPT = '.pdf,.xlsx,.xlsm,.csv,.pptx,.docx,.txt,.md,.json,.jpg,.jpeg,.png,.gif,.webp'
const MAX_FILES = 5
const SLOW_HINT_MS = 20000

interface UploadedFile {
  localId: string
  filename: string
  status: 'uploading' | 'done' | 'error'
  uploadId?: string
  mode?: 'document' | 'image' | 'text'
  size?: number
  note?: string
  error?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  visualization?: VisualizationData | null
  documents?: DocumentData[] | null
  attachments?: UploadedFile[]
}

let uploadSeq = 0
const nextLocalId = () => `u${++uploadSeq}-${Date.now()}`

function AttachmentIcon({ mode, className }: { mode?: string; className?: string }) {
  if (mode === 'image') return <ImageIcon className={className} />
  if (mode === 'document') return <FileText className={className} />
  return <File className={className} />
}

const markdownComponents: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto mt-2 mb-1 rounded-lg border border-gray-200">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-gray-600 border-b border-gray-100 whitespace-nowrap">{children}</td>
  ),
  tr: ({ children }) => <tr className="hover:bg-gray-50/60 transition-colors">{children}</tr>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-outside ml-4 space-y-0.5 my-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside ml-4 space-y-0.5 my-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  p: ({ children }) => <p className="leading-relaxed mb-1 last:mb-0">{children}</p>,
  code: ({ children }) => (
    <code className="font-mono text-xs bg-gray-100 text-[#434a98] px-1.5 py-0.5 rounded">{children}</code>
  ),
  h3: ({ children }) => <h3 className="font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="font-medium text-gray-700 mt-1.5 mb-0.5">{children}</h4>,
  hr: () => <hr className="border-gray-200 my-2" />,
}

export default function ChatPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const dashBase = location.pathname.replace(/\/dashboard\/.*$/, '/dashboard')

  const suggestions = [
    t('ia.chat.suggestions.recentOrders'),
    t('ia.chat.suggestions.salesHistory'),
    t('ia.chat.suggestions.unmatchedSkus'),
    t('ia.chat.suggestions.searchBasil'),
  ]

  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: t('ia.chat.welcome'),
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowHint, setSlowHint] = useState(false)
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [alertKey, setAlertKey] = useState<string | null>(null)
  const [showResolution, setShowResolution] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadingCount = uploads.filter(u => u.status === 'uploading').length

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, uploads])

  const uploadFile = async (file: File) => {
    const localId = nextLocalId()
    setUploads(prev => [...prev, { localId, filename: file.name, status: 'uploading' }])
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await ihFetch(UPLOADS_ENDPOINT, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // A 400 carries a user-facing `detail` written by the backend — show it verbatim.
        const detail = typeof data.detail === 'string' ? data.detail : t('ia.chat.attachments.uploadFailed')
        setUploads(prev => prev.map(u => u.localId === localId ? { ...u, status: 'error', error: detail } : u))
        return
      }
      setUploads(prev => prev.map(u => u.localId === localId
        ? { ...u, status: 'done', uploadId: data.upload_id, mode: data.mode, size: data.size, note: data.note || undefined }
        : u))
    } catch {
      setUploads(prev => prev.map(u => u.localId === localId
        ? { ...u, status: 'error', error: t('ia.chat.attachments.uploadFailed') }
        : u))
    }
  }

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    const room = MAX_FILES - uploads.length
    // Upload in parallel — one file per request.
    list.slice(0, Math.max(0, room)).forEach(uploadFile)
  }

  const removeUpload = (localId: string) => {
    setUploads(prev => prev.filter(u => u.localId !== localId))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (loading) return
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ ...prev[0], content: t('ia.chat.welcome') }]
      }
      return prev
    })
  }, [i18n.language, t])

  useEffect(() => {
    const q = searchParams.get('q')
    const key = searchParams.get('alertKey')
    if (key) setAlertKey(key)
    if (q) {
      setSearchParams({}, { replace: true })
      sendMessage(q)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resolveAlert() {
    if (!alertKey) return
    const existing = JSON.parse(sessionStorage.getItem('ih-resolved-alerts') || '[]')
    sessionStorage.setItem('ih-resolved-alerts', JSON.stringify([...new Set([...existing, alertKey])]))
    navigate(`${dashBase}/artificial-intelligence/order/orders`)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || uploadingCount > 0) return

    const attached = uploads.filter(u => u.status === 'done' && u.uploadId)
    const uploadIds = attached.map(u => u.uploadId as string)

    const userMsg: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      attachments: attached.length ? attached : undefined,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setUploads([])
    setLoading(true)
    const slowTimer = setTimeout(() => setSlowHint(true), SLOW_HINT_MS)

    try {
      const res = await ihFetch(CHAT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          // Send upload_ids only on the turn the files are attached.
          ...(uploadIds.length ? { upload_ids: uploadIds } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Agent error: ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No response received.',
        timestamp: new Date(),
        visualization: data.visualization ?? null,
        documents: data.documents ?? null,
      }])
      if (alertKey && data.changes_applied) {
        setShowResolution(true)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Connection error**\n\n${t('ia.chat.error', { err: String(err) })}`,
        timestamp: new Date(),
      }])
    } finally {
      clearTimeout(slowTimer)
      setSlowHint(false)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100dvh - 6.5rem)' }}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#434a98] flex items-center justify-center shadow-md shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-gray-800">{t('ia.chat.title')}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              <span className="text-xs text-gray-400 truncate">{t('ia.chat.subtitle')}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#434a98]/5 rounded-xl shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#434a98]" />
            <span className="text-xs text-[#434a98] font-medium">{t('ia.chat.badge')}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm
              ${msg.role === 'assistant' ? 'bg-[#434a98]' : 'bg-[#E8A80C]'}`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4 text-white" />
                : <User className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[78%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm
                ${msg.role === 'assistant'
                  ? 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                  : 'bg-[#434a98] text-white rounded-tr-sm shadow-sm'}`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.visualization && (
                <div className="w-full mt-1">
                  <ChartBlock visualization={msg.visualization} />
                </div>
              )}
              {msg.attachments?.length ? (
                <div className="mt-1 flex flex-col gap-1 items-end">
                  {msg.attachments.map(a => (
                    <div key={a.localId} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm max-w-[240px]">
                      <AttachmentIcon mode={a.mode} className="w-3.5 h-3.5 text-[#434a98] shrink-0" />
                      <span className="text-xs text-gray-600 truncate">{a.filename}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {msg.documents?.length ? (
                <div className="w-full mt-1 space-y-2">
                  {msg.documents.map(d => <DocumentBlock key={d.key} document={d} />)}
                </div>
              ) : null}
              <span className="text-[10px] text-gray-400 px-1 mt-1">{fmt(msg.timestamp)}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#434a98] flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#434a98] animate-spin" />
              <span className="text-xs text-gray-400">
                {slowHint ? t('ia.chat.attachments.generating') : t('ia.chat.querying')}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Alert resolution prompt */}
      {showResolution && !loading && (
        <div className="mx-4 sm:mx-6 mb-3 shrink-0 bg-amber-50 border border-amber-200 rounded-2xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">{t('ia.chat.resolution.question')}</p>
            <p className="text-xs text-amber-600 font-light mt-0.5">{t('ia.chat.resolution.hint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resolveAlert}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('ia.chat.resolution.yes')}
            </button>
            <button
              onClick={() => setShowResolution(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5" /> {t('ia.chat.resolution.no')}
            </button>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 sm:px-6 pb-3 shrink-0">
          <p className="text-xs text-gray-400 mb-2 font-medium">{t('ia.chat.tryAsking')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s: string) => (
              <button key={s} onClick={() => sendMessage(s)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 hover:border-[#434a98]/30 transition-colors shadow-sm">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        onDragOver={e => { e.preventDefault(); if (!loading) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="relative px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white shrink-0"
      >
        {dragging && (
          <div className="absolute inset-0 z-10 bg-[#434a98]/5 border-2 border-dashed border-[#434a98] rounded-xl m-2 flex items-center justify-center pointer-events-none">
            <span className="text-sm font-medium text-[#434a98] flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> {t('ia.chat.attachments.attach')}
            </span>
          </div>
        )}

        {/* Attachment chips */}
        {uploads.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {uploads.map(u => (
              <div key={u.uploadId || u.localId}
                className={`flex items-center gap-1.5 rounded-xl pl-2.5 pr-1.5 py-1.5 border text-xs max-w-[220px]
                  ${u.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                {u.status === 'uploading'
                  ? <Loader2 className="w-3.5 h-3.5 text-[#434a98] animate-spin shrink-0" />
                  : u.status === 'error'
                    ? <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    : <AttachmentIcon mode={u.mode} className="w-3.5 h-3.5 text-[#434a98] shrink-0" />}
                <div className="min-w-0 flex flex-col">
                  <span className={`truncate ${u.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>{u.filename}</span>
                  {u.status === 'uploading' && <span className="text-[10px] text-gray-400">{t('ia.chat.attachments.uploading')}</span>}
                  {u.status === 'error' && u.error && <span className="text-[10px] text-red-500 whitespace-normal">{u.error}</span>}
                  {u.status === 'done' && u.note && <span className="text-[10px] text-amber-600 whitespace-normal">{u.note}</span>}
                </div>
                <button type="button" onClick={() => removeUpload(u.localId)} title={t('common.remove')}
                  className="p-1 rounded-md hover:bg-gray-200/70 shrink-0">
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploads.length >= MAX_FILES}
            title={t('ia.chat.attachments.attach')}
            className="w-11 h-11 border border-gray-200 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-50 hover:text-[#434a98] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('ia.chat.inputPlaceholder')}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#434a98]/20 focus:border-[#434a98] transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={!input.trim() || loading || uploadingCount > 0}
            className="w-11 h-11 bg-[#434a98] text-white rounded-xl flex items-center justify-center hover:bg-[#3b4189] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
