type ActivityItem = { title: string; date: string }
type NewsItem     = { title: string }

type StaticContent = {
  activityTitle:    string
  activitySubtitle: string
  newsTitle:        string
  newsSubtitle:     string
  activity:         ActivityItem[]
  news:             NewsItem[]
}

const CONTENT: Record<string, Record<string, StaticContent>> = {
  ih: {
    en: {
      activityTitle:    'Release Activity',
      activitySubtitle: 'Common tasks and operations',
      newsTitle:        'Company News',
      newsSubtitle:     'Latest updates from Infinite Herbs',
      activity: [
        { title: 'Add Inventory manager button',               date: '2026-03-15' },
        { title: 'Integrations Whs Potted Herbs Manager',      date: '2026-02-26' },
        { title: 'Integrations App Compras and Bi dashboards', date: '2026-02-08' },
        { title: 'Activity item 4',                            date: '2026-01-16' },
      ],
      news: [
        { title: 'New Walmart DC' },
        { title: 'Agroaromas Adds Products' },
        { title: 'Sales Holy Week' },
        { title: 'Miami and Boston WHS are in service' },
      ],
    },
    es: {
      activityTitle:    'Actividad de Versiones',
      activitySubtitle: 'Tareas y operaciones comunes',
      newsTitle:        'Noticias Empresa',
      newsSubtitle:     'Últimas novedades de Infinite Herbs',
      activity: [
        { title: 'Botón de Gestor de Inventario',              date: '2026-03-15' },
        { title: 'Integración Whs Potted Herbs Manager',       date: '2026-02-26' },
        { title: 'Integración App Compras y BI dashboards',    date: '2026-02-08' },
        { title: 'Elemento de actividad 4',                    date: '2026-01-16' },
      ],
      news: [
        { title: 'Nuevo DC Walmart' },
        { title: 'Agroaromas Agrega Productos' },
        { title: 'Ventas Semana Santa' },
        { title: 'WHS Miami y Boston en servicio' },
      ],
    },
  },
  ag: {
    es: {
      activityTitle:    'Release Activity',
      activitySubtitle: 'Tareas/Operaciones Comunes',
      newsTitle:        'Noticias Empresa',
      newsSubtitle:     'Últimas novedades de Agroaromas',
      activity: [
        { title: 'Desarrollo Apartado Gestion de Inventario', date: '2026-03-15' },
        { title: 'Integración Delivery Product',              date: '2026-02-26' },
        { title: 'Integración App Compras/BI dashboards',     date: '2026-02-08' },
        { title: 'Desarrollo Hoja De Ruta',                   date: '2026-01-16' },
      ],
      news: [
        { title: 'Nueva Finca Mandarino Tenjo' },
        { title: 'Nuevo Producto' },
        { title: 'Cambio de precios' },
      ],
    },
    en: {
      activityTitle:    'Release Activity',
      activitySubtitle: 'Common Tasks / Operations',
      newsTitle:        'Company News',
      newsSubtitle:     'Latest updates from Agroaromas',
      activity: [
        { title: 'Inventory Management Module',               date: '2026-03-15' },
        { title: 'Delivery Product Integration',              date: '2026-02-26' },
        { title: 'Compras / BI Dashboards Integration',       date: '2026-02-08' },
        { title: 'Route Sheet Development',                   date: '2026-01-16' },
      ],
      news: [
        { title: 'New Mandarino Tenjo Farm' },
        { title: 'New Product Added' },
        { title: 'Price Update' },
      ],
    },
  },
}

export default function DashboardActivity({ tenant, locale }: { tenant: string; locale: string }) {
  const c = CONTENT[tenant]?.[locale] ?? CONTENT[tenant]?.es ?? CONTENT.ih.en

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-3">
        <div className="border-b border-border px-6 py-4">
          <p className="font-semibold text-foreground">{c.activityTitle}</p>
          <p className="text-xs text-muted-foreground">{c.activitySubtitle}</p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {c.activity.map((item) => (
            <li key={item.title} className="flex items-center gap-3 px-6 py-3.5">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
        <div className="border-b border-border px-6 py-4">
          <p className="font-semibold text-foreground">{c.newsTitle}</p>
          <p className="text-xs text-muted-foreground">{c.newsSubtitle}</p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {c.news.map((item) => (
            <li key={item.title} className="px-6 py-3.5">
              <p className="text-sm text-foreground">{item.title}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
