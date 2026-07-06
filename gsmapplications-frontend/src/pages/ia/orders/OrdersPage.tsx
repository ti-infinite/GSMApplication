import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ihFetch } from '@/shared/lib/ihAgent'
import {
  Package, CheckCircle2, Users, TrendingUp, AlertTriangle,
  Download, Search, ChevronUp, ChevronDown,
  X, Pencil, Save, MessageSquare, CheckCheck, Loader2, XCircle
} from 'lucide-react'
import TablePagination from '@/shared/components/TablePagination'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface OrderRow {
  DC_Name: string
  Client_Name: string
  PO_Number: string
  Date_Ship: string
  SKU: string
  Variety: string
  QTY: number
  Unit: string
}

interface EnrichedRow extends OrderRow {
  _fileKey: string
  _rowIndex: number
  _rowId: string
}

interface OrderFile {
  key: string
  lastModified: string
  size: number
  rows: OrderRow[]
}

interface AlertLine { index: number; issue: string }
interface Alert {
  fileKey: string
  file: string
  po: string
  client: string
  lines: AlertLine[]
}

type SortKey = keyof OrderRow
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10
const EDITABLE_FIELDS: (keyof OrderRow)[] = ['DC_Name', 'Client_Name', 'PO_Number', 'SKU', 'Variety', 'QTY', 'Unit']

function hasRowIssue(r: OrderRow): boolean {
  return !r.SKU?.trim() || r.SKU.startsWith('NO MATCH') ||
    !r.Client_Name?.trim() ||
    !r.PO_Number?.trim()
}

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-light uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-semibold text-gray-800 mt-0.5">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function downloadCSV(rows: EnrichedRow[], filename = 'orders.csv') {
  const headers: (keyof OrderRow)[] = ['DC_Name', 'Client_Name', 'PO_Number', 'Date_Ship', 'SKU', 'Variety', 'QTY', 'Unit']
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = String(r[h] ?? '')
        return v.includes(',') ? `"${v}"` : v
      }).join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'DC_Name',     label: 'DC Name' },
  { key: 'Client_Name', label: 'Client' },
  { key: 'PO_Number',   label: 'PO #' },
  { key: 'Date_Ship',   label: 'Ship Date' },
  { key: 'SKU',         label: 'SKU' },
  { key: 'Variety',     label: 'Variety' },
  { key: 'QTY',         label: 'QTY' },
  { key: 'Unit',        label: 'Unit' },
]

export default function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dashBase = location.pathname.replace(/\/dashboard\/.*$/, '/dashboard')

  const [orders, setOrders] = useState<OrderFile[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDC, setFilterDC] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const [sortKey, setSortKey] = useState<SortKey>('Date_Ship')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [showAlerts, setShowAlerts] = useState(true)
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('ih-resolved-alerts') || '[]')
      return new Set<string>(stored)
    } catch { return new Set<string>() }
  })
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null)

  const [page, setPage] = useState(0)

  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<Partial<OrderRow>>({})
  const [savingRowId, setSavingRowId] = useState<string | null>(null)
  const [savedRowIds, setSavedRowIds] = useState<Set<string>>(new Set())

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  useEffect(() => {
    sessionStorage.setItem('ih-resolved-alerts', JSON.stringify([...resolvedAlerts]))
  }, [resolvedAlerts])

  useEffect(() => { setPage(0) }, [search, filterClient, filterDC, filterDate, sortKey, sortDir])

  useEffect(() => {
    ihFetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.files || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const allRows: EnrichedRow[] = useMemo(() =>
    orders.flatMap(f =>
      f.rows.map((r, i) => ({
        ...r,
        _fileKey: f.key,
        _rowIndex: i,
        _rowId: `${f.key}::${i}`,
      }))
    ), [orders])

  const totalOrders = orders.length
  const totalLines = allRows.length
  const matchedLines = allRows.filter(r => r.SKU && r.SKU.trim()).length
  const matchRate = totalLines > 0 ? Math.round((matchedLines / totalLines) * 100) : 0
  const uniqueClients = new Set(allRows.map(r => r.Client_Name)).size

  const alerts: Alert[] = useMemo(() =>
    orders
      .map(f => {
        const issues = f.rows
          .map((r, i) => {
            const problems: string[] = []
            if (!r.SKU || !r.SKU.trim() || r.SKU.startsWith('NO MATCH')) problems.push('SKU not found')
            if (!r.Client_Name || !r.Client_Name.trim()) problems.push('Client not recognized')
            if (!r.PO_Number || !r.PO_Number.trim()) problems.push('PO number missing')
            return problems.length > 0 ? { index: i + 1, issue: problems.join(', ') } : null
          })
          .filter(Boolean) as AlertLine[]
        if (issues.length === 0) return null
        return {
          fileKey: f.key,
          file: f.key.split('/').pop() || f.key,
          po: f.rows[0]?.PO_Number || '—',
          client: f.rows[0]?.Client_Name || 'Unknown',
          lines: issues,
        }
      })
      .filter(Boolean) as Alert[]
  , [orders])

  const activeAlerts = alerts.filter(a => !resolvedAlerts.has(a.fileKey))

  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {}
    orders.forEach(f => {
      const d = f.lastModified.slice(0, 10)
      byDate[d] = (byDate[d] || 0) + 1
    })
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), orders: count }))
  }, [orders])

  const clientOptions = useMemo(() => [...new Set(allRows.map(r => r.Client_Name))].filter(Boolean).sort(), [allRows])
  const dcOptions = useMemo(() => [...new Set(allRows.map(r => r.DC_Name))].filter(Boolean).sort(), [allRows])

  const filteredRows = useMemo(() => {
    let rows = allRows
    if (filterClient) rows = rows.filter(r => r.Client_Name === filterClient)
    if (filterDC) rows = rows.filter(r => r.DC_Name === filterDC)
    if (filterDate) rows = rows.filter(r => r.Date_Ship?.startsWith(filterDate))
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)))
    }
    return [...rows].sort((a, b) => {
      const issueDiff = (hasRowIssue(b) ? 1 : 0) - (hasRowIssue(a) ? 1 : 0)
      if (issueDiff !== 0) return issueDiff
      const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [allRows, filterClient, filterDC, filterDate, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const rowStart = filteredRows.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rowEnd = Math.min((page + 1) * PAGE_SIZE, filteredRows.length)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function startEdit(row: EnrichedRow) {
    setEditingRowId(row._rowId)
    setEditRowData({ ...row })
  }

  function cancelEdit() {
    setEditingRowId(null)
    setEditRowData({})
  }

  async function saveRow(row: EnrichedRow) {
    setSavingRowId(row._rowId)
    try {
      const res = await ihFetch('/api/orders/row', {
        method: 'PATCH',
        body: JSON.stringify({
          file_key: row._fileKey,
          row_index: row._rowIndex,
          changes: editRowData,
        }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)

      setOrders(prev => prev.map(f => {
        if (f.key !== row._fileKey) return f
        const newRows = [...f.rows]
        newRows[row._rowIndex] = { ...newRows[row._rowIndex], ...editRowData } as OrderRow
        return { ...f, rows: newRows }
      }))

      setSavedRowIds(s => new Set(s).add(row._rowId))
      setTimeout(() => setSavedRowIds(s => { const n = new Set(s); n.delete(row._rowId); return n }), 2500)
      setEditingRowId(null)
      setEditRowData({})
    } catch (e) {
      alert(`Could not save: ${e}`)
    } finally {
      setSavingRowId(null)
    }
  }

  function jumpToAlertRow(alert: Alert, lineIndex: number) {
    setSearch(''); setFilterClient(''); setFilterDC(''); setFilterDate('')
    const rowId = `${alert.fileKey}::${lineIndex - 1}`
    setHighlightRowId(rowId)
    const sorted = [...allRows].sort((a, b) => {
      const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    const idx = sorted.findIndex(r => r._rowId === rowId)
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE))
    setTimeout(() => {
      rowRefs.current[rowId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const row = allRows.find(r => r._rowId === rowId)
      if (row) startEdit(row)
      setTimeout(() => setHighlightRowId(null), 3000)
    }, 150)
  }

  function askAgent(alert: Alert) {
    const issueLines = alert.lines.map(l =>
      `- Row index ${l.index - 1} (line ${l.index}): ${l.issue}`
    ).join('\n')
    const q = `I need help resolving a validation alert for PO ${alert.po} from "${alert.client}".\n\nFile: ${alert.fileKey}\n\nIssues:\n${issueLines}\n\nPlease query the product catalog and sales history to find the correct matches, then walk me through applying the corrections.`
    navigate(`${dashBase}/artificial-intelligence/order/chat?q=${encodeURIComponent(q)}&alertKey=${encodeURIComponent(alert.fileKey)}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Orders</h1>
          <p className="text-gray-400 font-light text-sm mt-0.5">Order processing overview & data</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-xs text-green-700 font-medium">Agent Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={loading ? '—' : totalOrders} sub="processed by agent" icon={Package} color="bg-[#434a98]" />
        <StatCard title="Match Rate" value={loading ? '—' : `${matchRate}%`} sub={`${matchedLines}/${totalLines} lines`} icon={CheckCircle2} color="bg-[#20BAD3]" />
        <StatCard title="Active Clients" value={loading ? '—' : uniqueClients} sub="unique buyers" icon={Users} color="bg-[#E96F1F]" />
        <StatCard title="Order Lines" value={loading ? '—' : totalLines} sub="total line items" icon={TrendingUp} color="bg-[#E8A80C]" />
      </div>

      {/* Chart + Latest Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Orders Processed by Day</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="orders" fill="#434a98" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
              {loading ? 'Loading...' : 'No data yet'}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Latest Orders</h2>
          <div className="space-y-3">
            {loading ? <p className="text-sm text-gray-300">Loading...</p>
              : orders.length === 0 ? <p className="text-sm text-gray-300">No orders yet</p>
              : [...orders]
                  .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
                  .slice(0, 6)
                  .map(f => {
                    const client = f.rows[0]?.Client_Name || 'Unknown'
                    const po = f.rows[0]?.PO_Number || '—'
                    const lines = f.rows.length
                    const matched = f.rows.filter(r => r.SKU).length
                    const pct = lines > 0 ? Math.round((matched / lines) * 100) : 0
                    return (
                      <div key={f.key} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${pct === 100 ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{client}</p>
                          <p className="text-[10px] text-gray-400">PO {po} · {lines} lines</p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ${pct === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
          </div>
        </div>
      </div>

      {/* Alert Panel */}
      {!loading && activeAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAlerts(v => !v)}
            className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-amber-100/50 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {activeAlerts.length} order{activeAlerts.length > 1 ? 's' : ''} need CSR validation
              </p>
              <p className="text-xs text-amber-600 font-light">
                Agent could not match client or SKU — manual review required
              </p>
            </div>
            {showAlerts ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
          </button>

          {showAlerts && (
            <div className="px-4 sm:px-6 pb-5 space-y-3">
              {activeAlerts.map(a => (
                <div key={a.fileKey} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{a.client}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">PO {a.po} · {a.file}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      {a.lines.length} line{a.lines.length > 1 ? 's' : ''} flagged
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {a.lines.map(l => (
                      <div key={l.index} className="flex items-center justify-between gap-3">
                        <p className="text-xs text-amber-700">
                          <span className="font-medium">Line {l.index}:</span> {l.issue}
                        </p>
                        <button
                          onClick={() => jumpToAlertRow(a, l.index)}
                          className="flex items-center gap-1 text-[11px] text-[#434a98] hover:underline shrink-0"
                        >
                          <Pencil className="w-3 h-3" /> Edit row
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-amber-100">
                    <button
                      onClick={() => askAgent(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#434a98] text-white rounded-lg text-xs hover:bg-[#3b4189] transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Ask Agent
                    </button>
                    <button
                      onClick={() => setResolvedAlerts(s => new Set(s).add(a.fileKey))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs hover:bg-green-100 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium text-gray-700 mr-2">All Orders</h2>

          <div className="relative w-full sm:w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#434a98]/30 w-full" />
          </div>

          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#434a98]/30">
            <option value="">All clients</option>
            {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterDC} onChange={e => setFilterDC(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#434a98]/30">
            <option value="">All DCs</option>
            {dcOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <input type="month" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#434a98]/30" />

          {(search || filterClient || filterDC || filterDate) && (
            <button onClick={() => { setSearch(''); setFilterClient(''); setFilterDC(''); setFilterDate('') }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-start gap-3">
            <TablePagination
              page={page}
              totalPages={totalPages}
              rowStart={rowStart}
              rowEnd={rowEnd}
              total={filteredRows.length}
              onPrev={() => setPage(p => Math.max(0, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />
            <button
              onClick={() => downloadCSV(filteredRows, `orders-export-${new Date().toISOString().slice(0, 10)}.csv`)}
              className="flex items-center gap-1.5 text-xs bg-[#434a98] text-white px-3 py-1.5 rounded-lg hover:bg-[#434a98]/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {COLUMNS.map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)}
                    className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key
                        ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        : <ChevronUp className="w-3 h-3 opacity-20" />}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-300">Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-300">No rows match your filters</td></tr>
              ) : pagedRows.map(r => {
                const isEditing = editingRowId === r._rowId
                const isSaving = savingRowId === r._rowId
                const wasSaved = savedRowIds.has(r._rowId)
                const isHighlighted = highlightRowId === r._rowId
                const hasAlert = alerts.some(a =>
                  a.fileKey === r._fileKey && a.lines.some(l => l.index - 1 === r._rowIndex)
                )

                return (
                  <tr
                    key={r._rowId}
                    ref={el => { rowRefs.current[r._rowId] = el }}
                    className={`transition-colors
                      ${isEditing ? 'bg-[#434a98]/5 ring-1 ring-inset ring-[#434a98]/20' : ''}
                      ${wasSaved && !isEditing ? 'bg-green-50' : ''}
                      ${isHighlighted && !isEditing ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''}
                      ${!isEditing && !wasSaved && !isHighlighted ? 'hover:bg-gray-50/50' : ''}
                    `}
                  >
                    {COLUMNS.map(col => {
                      const editable = isEditing && EDITABLE_FIELDS.includes(col.key)
                      const val = isEditing ? (editRowData[col.key] ?? '') : r[col.key]

                      return (
                        <td key={col.key} className="px-4 py-2.5">
                          {editable ? (
                            <input
                              autoFocus={col.key === 'PO_Number' && !r.PO_Number || col.key === 'SKU' && hasAlert}
                              value={String(val ?? '')}
                              onChange={e => setEditRowData(d => ({ ...d, [col.key]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveRow(r)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              className="w-full min-w-[80px] px-2 py-1 border border-[#434a98]/40 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#434a98]/40 text-xs"
                            />
                          ) : (
                            col.key === 'SKU' ? (
                              r.SKU
                                ? <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">{r.SKU}</span>
                                : <span className="text-amber-500 font-medium">Not found</span>
                            ) : col.key === 'PO_Number' ? (
                              r.PO_Number
                                ? <span className="text-gray-600">{r.PO_Number}</span>
                                : <span className="text-amber-500 font-medium">Missing</span>
                            ) : col.key === 'Client_Name' ? (
                              <span className="font-medium text-gray-700">{r.Client_Name || <span className="text-amber-500">Unknown</span>}</span>
                            ) : (
                              <span className="text-gray-600">{String(r[col.key] ?? '') || '—'}</span>
                            )
                          )}
                        </td>
                      )
                    })}

                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => saveRow(r)}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#434a98] text-white rounded-md text-[11px] hover:bg-[#3b4189] disabled:opacity-50 transition-colors"
                          >
                            {isSaving
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Save className="w-3 h-3" />}
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : wasSaved ? (
                        <span className="flex items-center gap-1 text-green-600 text-[11px]">
                          <CheckCheck className="w-3.5 h-3.5" /> Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1.5 rounded-md text-gray-300 hover:text-[#434a98] hover:bg-[#434a98]/5 transition-colors"
                          title="Edit row"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
