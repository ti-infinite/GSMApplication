import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Leaf, RefreshCw, TrendingUp, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ihFetch } from '@/shared/lib/ihAgent'

interface IHSalesRow {
  NumKey: number; Code: string; Description: string; Name: string; Customer: string
  Division: string; Grade: string; Invoice: string; PO: string; DateShip: string
  DeliveryDate: string | null; Location: string; Qty: number; Price: number
  Rebate: number; Amount: number; InvoiceRow: number
}

const COLUMNS: { key: keyof IHSalesRow; label: string; numeric?: boolean }[] = [
  { key: 'DateShip',     label: 'Ship Date' },
  { key: 'Code',         label: 'Code' },
  { key: 'Description',  label: 'Description' },
  { key: 'Name',         label: 'Customer' },
  { key: 'Customer',     label: 'Cust #' },
  { key: 'Invoice',      label: 'Invoice' },
  { key: 'PO',           label: 'PO' },
  { key: 'Division',     label: 'Division' },
  { key: 'Grade',        label: 'Grade' },
  { key: 'Location',     label: 'Location' },
  { key: 'Qty',          label: 'Qty',        numeric: true },
  { key: 'Price',        label: 'Price',       numeric: true },
  { key: 'Rebate',       label: 'Rebate',      numeric: true },
  { key: 'Amount',       label: 'Amount ($)',  numeric: true },
  { key: 'DeliveryDate', label: 'Delivery' },
  { key: 'InvoiceRow',   label: 'Row',         numeric: true },
  { key: 'NumKey',       label: 'NumKey',      numeric: true },
]

const PAGE_SIZES = [1000, 2000, 5000] as const
type PageSize = (typeof PAGE_SIZES)[number]
type SortDir = 'asc' | 'desc' | null

export default function IHSalesPage() {
  const [rows, setRows] = useState<IHSalesRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [pageSize, setPageSize] = useState<PageSize>(5000)

  const [globalQ, setGlobalQ] = useState('')
  const [colFilters, setColFilters] = useState<Partial<Record<keyof IHSalesRow, string>>>({})
  const [showColFilters, setShowColFilters] = useState(false)
  const [sortCol, setSortCol] = useState<keyof IHSalesRow | null>('DateShip')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const globalQRef = useRef(globalQ)
  const colFiltersRef = useRef(colFilters)
  const pageSizeRef = useRef(pageSize)

  const fetchRows = useCallback(async (targetPage = 0, size?: number) => {
    const sz = size ?? pageSizeRef.current
    const q = globalQRef.current
    const cf = colFiltersRef.current
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q)              params.set('q', q)
      if (cf.Description) params.set('description', cf.Description)
      if (cf.Name)        params.set('client', cf.Name)
      if (cf.Customer)    params.set('customer', cf.Customer)
      if (cf.Grade)       params.set('grade', cf.Grade)
      if (cf.Division)    params.set('division', cf.Division)
      if (cf.Location)    params.set('location', cf.Location)
      if (cf.DateShip) {
        const yr = cf.DateShip.slice(0, 4)
        if (/^\d{4}$/.test(yr)) params.set('year', yr)
      }
      params.set('limit', String(sz))
      params.set('page', String(targetPage))

      const res = await ihFetch(`/api/ihsales?${params}`)
      const data = await res.json()
      if (data.error && !data.products?.length) setError(data.error)
      setRows(data.products || [])
      setHasMore(data.has_more ?? false)
      setPage(targetPage)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRows(0) }, [fetchRows])

  const applyFilters = useCallback((targetPage = 0) => {
    globalQRef.current = globalQ
    colFiltersRef.current = colFilters
    fetchRows(targetPage)
  }, [globalQ, colFilters, fetchRows])

  const clearFilters = () => {
    setGlobalQ('')
    setColFilters({})
    globalQRef.current = ''
    colFiltersRef.current = {}
    fetchRows(0)
  }

  const changePageSize = (s: PageSize) => {
    setPageSize(s)
    pageSizeRef.current = s
    fetchRows(0, s)
  }

  const hasActiveFilters = globalQRef.current || Object.values(colFiltersRef.current).some(Boolean)
  const hasPendingChanges = globalQ !== globalQRef.current ||
    JSON.stringify(colFilters) !== JSON.stringify(colFiltersRef.current)

  const sorted = [...rows].sort((a, b) => {
    if (!sortCol || !sortDir) return 0
    const av = a[sortCol], bv = b[sortCol]
    if (av == null) return 1; if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (col: keyof IHSalesRow) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const totalAmount = rows.reduce((s, r) => s + (r.Amount || 0), 0)
  const totalQty = rows.reduce((s, r) => s + (r.Qty || 0), 0)
  const uniqueCustomers = new Set(rows.map(r => r.Customer)).size
  const uniqueProducts = new Set(rows.map(r => r.Code)).size

  return (
    <div className="space-y-5 flex flex-col" style={{ height: 'calc(100dvh - 6.5rem)' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E8A80C] flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">IH Sales</h1>
            <p className="text-xs text-gray-400 font-light">
              db_srv.IHSales · {loading ? 'Loading...' : `${rows.length.toLocaleString()} rows · page ${page + 1}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 text-red-500 rounded-xl text-sm hover:bg-red-100 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <select value={pageSize} onChange={e => changePageSize(Number(e.target.value) as PageSize)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 bg-white focus:outline-none">
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n.toLocaleString()} / page</option>)}
          </select>
          <button onClick={() => setShowColFilters(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors ${showColFilters ? 'bg-[#434a98] text-white border-[#434a98]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Filters {showColFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => fetchRows(page)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {[
          { label: 'Rows',      value: loading ? '—' : rows.length.toLocaleString(), icon: Leaf,       color: 'bg-[#E8A80C]' },
          { label: 'Customers', value: loading ? '—' : uniqueCustomers,              icon: TrendingUp,  color: 'bg-[#434a98]' },
          { label: 'Products',  value: loading ? '—' : uniqueProducts,               icon: Search,      color: 'bg-[#20BAD3]' },
          { label: 'Amount',    value: loading ? '—' : `$${totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'bg-[#E96F1F]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-4 h-4 text-white" /></div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-lg font-semibold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={globalQ}
          onChange={e => setGlobalQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters(0)}
          placeholder="Search code, description, customer, invoice, PO… (press Enter to search)"
          className="w-full pl-9 pr-32 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#434a98]/20 focus:border-[#434a98]"
        />
        {hasPendingChanges && (
          <button
            onClick={() => applyFilters(0)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#434a98] text-white text-xs rounded-lg hover:bg-[#3b4189] transition-colors"
          >
            Apply ↵
          </button>
        )}
      </div>

      {/* Column filters panel */}
      {showColFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filter by column</p>
            <p className="text-[10px] text-gray-400">Press Enter or click Apply in any field to search</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(['Description', 'Name', 'Customer', 'Grade', 'Division', 'Location', 'DateShip'] as (keyof IHSalesRow)[]).map(key => {
              const col = COLUMNS.find(c => c.key === key)
              return (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block">{col?.label ?? key}</label>
                  <input
                    value={colFilters[key] || ''}
                    onChange={e => setColFilters(p => ({ ...p, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') applyFilters(0) }}
                    placeholder={key === 'Grade' ? 'CO / OR' : key === 'DateShip' ? '2026' : `${col?.label}…`}
                    className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#434a98]/20 focus:border-[#434a98] placeholder:text-gray-300"
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => applyFilters(0)}
              className="px-4 py-1.5 bg-[#434a98] text-white text-xs rounded-lg hover:bg-[#3b4189] transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {error && <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs text-yellow-700 shrink-0"><strong>EC2:</strong> {error}</div>}

      {/* Table */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-0 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="text-sm w-max min-w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                {COLUMNS.map(({ key, label }) => (
                  <th key={key} onClick={() => toggleSort(key)}
                    className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#434a98] select-none whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {label}
                      {sortCol === key
                        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#434a98]" /> : <ChevronDown className="w-3 h-3 text-[#434a98]" />)
                        : <span className="w-3" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 14 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {COLUMNS.map((_, j) => <td key={j} className="px-3 py-2.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>)}
                </tr>
              )) : sorted.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-gray-300 text-sm">No results</td></tr>
              ) : sorted.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  {COLUMNS.map(({ key, numeric }) => {
                    const val = row[key]
                    return (
                      <td key={key} className={`px-3 py-2 text-gray-700 whitespace-nowrap ${numeric ? 'text-right tabular-nums' : ''}`}>
                        {key === 'Code' ? (
                          <span className="font-mono text-xs bg-[#434a98]/10 text-[#434a98] px-2 py-0.5 rounded-md">{String(val ?? '')}</span>
                        ) : key === 'Grade' ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${val === 'OR' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{String(val ?? '')}</span>
                        ) : key === 'Amount' ? (
                          <span className="font-medium text-green-700">${Number(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : key === 'Price' || key === 'Rebate' ? (
                          <span>${Number(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : numeric ? Number(val ?? 0).toLocaleString() : String(val ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => fetchRows(Math.max(0, page - 1))} disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-white disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-xs text-gray-400 tabular-nums px-1">Page {page + 1} · {rows.length.toLocaleString()} rows</span>
              <button onClick={() => fetchRows(page + 1)} disabled={!hasMore}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-white disabled:opacity-40 transition-colors">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 tabular-nums hidden sm:block">
              {uniqueCustomers} customers · {uniqueProducts} products · {totalQty.toLocaleString()} units · ${totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
