import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ihFetch } from '@/shared/lib/ihAgent'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Target, Users, Package } from 'lucide-react'

interface OrderRow { DC_Name: string; Client_Name: string; PO_Number: string; Date_Ship: string; SKU: string; Variety: string; QTY: string; Unit: string }
interface OrderFile { key: string; lastModified: string; size: number; rows: OrderRow[] }

const COLORS = ['#434a98', '#20BAD3', '#E8A80C', '#E96F1F', '#C7ABD8', '#938B97']

export default function MetricsPage() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<OrderFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ihFetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.files || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const allRows = orders.flatMap(f => f.rows)
  const matchedRows = allRows.filter(r => r.SKU?.length > 0)
  const matchRate = allRows.length > 0 ? (matchedRows.length / allRows.length) * 100 : 0

  const weeklyData: Record<string, { matched: number; total: number }> = {}
  orders.forEach(f => {
    const date = new Date(f.lastModified)
    const week = `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleString('default', { month: 'short' })}`
    if (!weeklyData[week]) weeklyData[week] = { matched: 0, total: 0 }
    weeklyData[week].total += 1
    const matched = f.rows.filter(r => r.SKU).length
    weeklyData[week].matched += matched > 0 ? 1 : 0
  })
  const weeklyChart = Object.entries(weeklyData).map(([week, v]) => ({ week, 'Orders': v.total, 'Fully Matched': v.matched }))

  const clientCounts: Record<string, number> = {}
  allRows.forEach(r => { clientCounts[r.Client_Name] = (clientCounts[r.Client_Name] || 0) + 1 })
  const topClients = Object.entries(clientCounts).sort(([, a], [, b]) => b - a).slice(0, 8)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, lines: count }))

  const matchTimeline = orders.sort((a, b) => a.lastModified.localeCompare(b.lastModified)).map(f => {
    const matched = f.rows.filter(r => r.SKU).length
    const pct = f.rows.length > 0 ? Math.round((matched / f.rows.length) * 100) : 0
    return { date: f.lastModified.slice(5, 10), 'Match %': pct }
  })

  const varietyCounts: Record<string, number> = {}
  allRows.forEach(r => { if (r.Variety) varietyCounts[r.Variety] = (varietyCounts[r.Variety] || 0) + 1 })
  const pieData = Object.entries(varietyCounts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }))

  const kpis = [
    { label: t('ia.metrics.kpi.matchRate'),     value: loading ? '—' : `${matchRate.toFixed(1)}%`, sub: t('ia.metrics.kpi.matchSub', { matched: matchedRows.length, total: allRows.length }), icon: Target,     color: 'bg-[#20BAD3]' },
    { label: t('ia.metrics.kpi.totalOrders'),   value: loading ? '—' : orders.length,               sub: t('ia.metrics.kpi.ordersSub'),                                                          icon: Package,    color: 'bg-[#434a98]' },
    { label: t('ia.metrics.kpi.uniqueClients'), value: loading ? '—' : new Set(allRows.map(r => r.Client_Name)).size, sub: t('ia.metrics.kpi.clientsSub'),                                      icon: Users,      color: 'bg-[#E96F1F]' },
    { label: t('ia.metrics.kpi.avgLines'),      value: loading ? '—' : orders.length > 0 ? (allRows.length / orders.length).toFixed(1) : '0', sub: t('ia.metrics.kpi.avgSub'),                 icon: TrendingUp, color: 'bg-[#E8A80C]' },
  ]

  const empty = (label: string) => (
    <div className="h-48 flex items-center justify-center text-gray-200 text-sm">{loading ? t('ia.metrics.loading') : label}</div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">{t('ia.metrics.title')}</h1>
        <p className="text-sm text-gray-400 font-light mt-0.5">{t('ia.metrics.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100 flex items-start gap-3">
            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-light uppercase tracking-wider truncate">{label}</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-800 mt-0.5">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">{t('ia.metrics.charts.weeklyVolume')}</h2>
          {weeklyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="Orders" fill="#434a98" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fully Matched" fill="#20BAD3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : empty(t('ia.metrics.noData'))}
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">{t('ia.metrics.charts.matchRate')}</h2>
          {matchTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={matchTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} unit="%" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={v => [`${v}%`, 'Match Rate']} />
                <Line type="monotone" dataKey="Match %" stroke="#20BAD3" strokeWidth={2} dot={{ fill: '#20BAD3', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : empty(t('ia.metrics.noData'))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">{t('ia.metrics.charts.topClients')}</h2>
          {topClients.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="lines" fill="#E8A80C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : empty(t('ia.metrics.noData'))}
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">{t('ia.metrics.charts.topVarieties')}</h2>
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-full sm:w-[45%] shrink-0">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-600 truncate flex-1">{d.name}</span>
                    <span className="text-xs font-medium text-gray-800 shrink-0">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : empty(t('ia.metrics.noData'))}
        </div>
      </div>
    </div>
  )
}
