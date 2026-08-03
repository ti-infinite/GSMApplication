import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ihFetch } from '@/shared/lib/ihAgent'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import ChartBlock, { type VisualizationData } from '@/shared/components/ChartBlock'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  visualization?: VisualizationData | null
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

  const suggestions = [
    t('ia.purchases.chat.suggestions.topSuppliers'),
    t('ia.purchases.chat.suggestions.monthlyTrend'),
    t('ia.purchases.chat.suggestions.mexicoProducts'),
    t('ia.purchases.chat.suggestions.spendByLocation'),
  ]

  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: t('ia.purchases.chat.welcome'),
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ ...prev[0], content: t('ia.purchases.chat.welcome') }]
      }
      return prev
    })
  }, [i18n.language, t])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await ihFetch('/purchases/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error(`Agent error: ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No response received.',
        timestamp: new Date(),
        visualization: data.visualization ?? null,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Connection error**\n\n${t('ia.purchases.chat.error', { err: String(err) })}`,
        timestamp: new Date(),
      }])
    } finally {
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
            <h1 className="text-base font-semibold text-gray-800">{t('ia.purchases.chat.title')}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              <span className="text-xs text-gray-400 truncate">{t('ia.purchases.chat.subtitle')}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#434a98]/5 rounded-xl shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#434a98]" />
            <span className="text-xs text-[#434a98] font-medium">{t('ia.purchases.chat.badge')}</span>
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
              <span className="text-xs text-gray-400">{t('ia.purchases.chat.querying')}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 sm:px-6 pb-3 shrink-0">
          <p className="text-xs text-gray-400 mb-2 font-medium">{t('ia.purchases.chat.tryAsking')}</p>
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
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white shrink-0">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('ia.purchases.chat.inputPlaceholder')}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#434a98]/20 focus:border-[#434a98] transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="w-11 h-11 bg-[#434a98] text-white rounded-xl flex items-center justify-center hover:bg-[#3b4189] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
