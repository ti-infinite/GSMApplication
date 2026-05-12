import {
  ShoppingBag, BarChart2, Activity, Database,
  GraduationCap, Route, Leaf, Clock, CreditCard,
  type LucideIcon,
} from 'lucide-react'

type StaticCard = { title: string; description: string; Icon: LucideIcon }

const CARDS: Record<string, Record<string, StaticCard[]>> = {
  ih: {
    en: [
      { title: 'Compras',       description: 'Access Report',           Icon: ShoppingBag   },
      { title: 'BI Dashboards', description: 'Access All Bi Report',    Icon: BarChart2     },
      { title: 'Productivity',  description: 'Traceability',            Icon: Activity      },
      { title: 'Masters',       description: 'Change Data Projections', Icon: Database      },
      { title: 'Learning',      description: 'Resources Tutorials',     Icon: GraduationCap },
    ],
    es: [
      { title: 'Compras',       description: 'Acceso Reporte',          Icon: ShoppingBag   },
      { title: 'BI Dashboards', description: 'Acceso Reportes BI',      Icon: BarChart2     },
      { title: 'Productividad', description: 'Trazabilidad',            Icon: Activity      },
      { title: 'Maestros',      description: 'Cambiar Proyecciones',    Icon: Database      },
      { title: 'Aprendizaje',   description: 'Tutoriales y Recursos',   Icon: GraduationCap },
    ],
  },
  ag: {
    es: [
      { title: 'Creditos AA', description: 'Acceso Reportes créditos', Icon: CreditCard },
      { title: 'BI',          description: 'Acceso Reportes BI',       Icon: BarChart2  },
      { title: 'Hoja Ruta',   description: 'Trazabilidad Reportes',    Icon: Route      },
      { title: 'Heeb Need',   description: 'Proyecciones Reportes',    Icon: Leaf       },
      { title: 'Horas Extra', description: 'Reportes Agregar',         Icon: Clock      },
    ],
    en: [
      { title: 'Credits AA',  description: 'Access Credit Reports',    Icon: CreditCard },
      { title: 'BI',          description: 'Access BI Reports',        Icon: BarChart2  },
      { title: 'Route Sheet', description: 'Traceability Reports',     Icon: Route      },
      { title: 'Herb Need',   description: 'Projection Reports',       Icon: Leaf       },
      { title: 'Overtime',    description: 'Add Reports',              Icon: Clock      },
    ],
  },
}

export default function QuickCards({ tenant, locale }: { tenant: string; locale: string }) {
  const cards = CARDS[tenant]?.[locale] ?? CARDS[tenant]?.en ?? CARDS.ih.en

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ title, description, Icon }) => (
        <div
          key={title}
          className="relative flex min-h-40 cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xl font-bold leading-tight text-primary">{title}</p>
          <p className="mt-auto w-2/3 text-sm leading-snug text-muted-foreground">{description}</p>
          <Icon className="absolute -bottom-3 -right-3 h-24 w-24 text-secondary/70" />
        </div>
      ))}
    </div>
  )
}
