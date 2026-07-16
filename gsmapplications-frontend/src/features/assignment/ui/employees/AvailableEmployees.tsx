import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { AvailableRow } from './AvailableRow'
import type { EmployeeGroup } from '../../model/types'
import type { Employee } from '@/entities/employee'

/** Sticky sidebar: searchable list of unassigned employees. */
export function AvailableEmployees({ count, total, query, onQuery, filtered, mode, groups, onAdd, onAddIndividual }: {
  count:           number
  total:           number
  query:           string
  onQuery:         (q: string) => void
  filtered:        Employee[]
  mode:            'groups' | 'individual'
  groups:          EmployeeGroup[]
  onAdd:           (emp: Employee, groupId: string) => void
  onAddIndividual: (emp: Employee) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:sticky md:top-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('productivity.step2.available')}
        </p>
        <span className="text-xs font-medium text-muted-foreground">
          {count}/{total}
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('productivity.step2.searchEmployee')}
          value={query}
          onChange={e => onQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {query ? t('productivity.step2.noSearchResults') : t('productivity.step2.allAssigned')}
          </p>
        ) : (
          filtered.map((emp, idx) => (
            <AvailableRow
              key={emp.id}
              employee={emp}
              colorIdx={idx}
              mode={mode}
              groups={groups}
              onAdd={groupId => onAdd(emp, groupId)}
              onAddIndividual={() => onAddIndividual(emp)}
            />
          ))
        )}
      </div>
    </div>
  )
}
