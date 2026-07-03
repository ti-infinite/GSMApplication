import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#434a98', '#E8A80C', '#6b73c1', '#f0c34d', '#8b91d4', '#f5d980', '#3b7dd8', '#e07b39']

interface Dataset {
  label: string
  data: number[]
}

export interface VisualizationData {
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  title: string
  labels: string[]
  datasets: Dataset[]
  x_label?: string
  y_label?: string
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString()
}

export default function ChartBlock({ visualization }: { visualization: VisualizationData }) {
  const { type, title, labels, datasets, x_label, y_label } = visualization

  const barLineData = labels.map((name, i) => {
    const point: Record<string, string | number> = { name }
    datasets.forEach(ds => { point[ds.label] = ds.data[i] ?? 0 })
    return point
  })

  const pieData = labels.map((name, i) => ({
    name,
    value: datasets[0]?.data[i] ?? 0,
  }))

  return (
    <div className="mt-3 mb-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        {type === 'bar' ? (
          <BarChart data={barLineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }}
              label={x_label ? { value: x_label, position: 'insideBottom', offset: -2, fontSize: 11 } : undefined} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt}
              label={y_label ? { value: y_label, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {datasets.map((ds, i) => (
              <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={barLineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {datasets.map((ds, i) => (
              <Line key={ds.label} type="monotone" dataKey={ds.label}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name"
              cx="50%" cy="50%"
              innerRadius={type === 'doughnut' ? 70 : 0}
              outerRadius={110}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
