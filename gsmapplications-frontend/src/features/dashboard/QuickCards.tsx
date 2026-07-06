import { Link } from 'react-router-dom'
import { type MenuOption, getIcon, firstRoute } from '@/shared/lib/menu'

export default function QuickCards({ items, locale }: { items: MenuOption[]; locale: string }) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map(item => {
        const Icon = getIcon(item.Icon)
        const route = firstRoute(item)
        const href = route ? `/${locale}${route}` : '#'

        return (
          <Link
            key={item.IdObject ?? item.Description}
            to={href}
            className="relative flex min-h-40 cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xl font-bold leading-tight text-primary">{item.Description}</p>
            <Icon className="absolute -bottom-3 -right-3 h-24 w-24 text-secondary/70" />
          </Link>
        )
      })}
    </div>
  )
}