import { Search, Plus, X, Users, User } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Employee, EmployeeGroup, AssignmentMode } from './types'
import type { useEmployeeGroups } from './hooks/useEmployeeGroups'

type GroupState = ReturnType<typeof useEmployeeGroups>

interface Props {
  totalEmployees: number
  groups:         GroupState
  onBack:         () => void
  onNext:         () => void
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const COLORS = [
  'bg-blue-500',   'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500',   'bg-teal-500',
]

function Avatar({ name, idx }: { name: string; idx: number }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${COLORS[idx % COLORS.length]}`}>
      {initials(name)}
    </span>
  )
}

export function Step2Employees({ totalEmployees, groups: g, onBack, onNext }: Props) {
  const totalAssigned = g.groups.reduce((sum, gr) => sum + gr.employees.length, 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Mode toggle + group count */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full rounded-lg border border-border sm:w-auto">
          <ModeBtn active={g.mode === 'groups'}     onClick={() => g.setMode('groups')}     icon={<Users className="h-4 w-4" />} label="Grupos" />
          <ModeBtn active={g.mode === 'individual'} onClick={() => g.setMode('individual')} icon={<User  className="h-4 w-4" />} label="Individual" />
        </div>

        {g.mode === 'groups' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Grupos:</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => g.setGroupCount(g.groupCount - 1)} disabled={g.groupCount <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted disabled:opacity-40">
                −
              </button>
              <span className="w-4 text-center text-sm font-semibold text-foreground">{g.groupCount}</span>
              <button type="button" onClick={() => g.setGroupCount(g.groupCount + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted">
                +
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">

        {/* ── Available employees — sticky sidebar ── */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Disponibles
            </p>
            <span className="text-xs font-medium text-muted-foreground">
              {g.available.length}/{totalEmployees}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={g.searchQuery}
              onChange={e => g.setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* List */}
          <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
            {g.filteredAvailable.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {g.searchQuery ? 'Sin resultados' : 'Todos asignados'}
              </p>
            ) : (
              g.filteredAvailable.map((emp, idx) => (
                <AvailableRow
                  key={emp.id}
                  employee={emp}
                  colorIdx={idx}
                  groups={g.groups}
                  onAdd={groupId => g.addToGroup(emp, groupId)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Groups ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
          {g.groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onRemove={(empId) => g.removeFromGroup(empId, group.id)}
            />
          ))}
        </div>
      </div>

      {/* Bottom summary bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{totalAssigned}</strong> asignados</span>
          <span><strong className="text-foreground">{g.available.length}</strong> disponibles</span>
          {g.mode === 'groups' && (
            <>
              <span>Grupos: <strong className="text-foreground">{g.groupCount}</strong></span>
              <span>
                Rango:{' '}
                <strong className="text-foreground">
                  {Math.min(...g.groups.map(gr => gr.employees.length))}–
                  {Math.max(...g.groups.map(gr => gr.employees.length))} por grupo
                </strong>
              </span>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>← Atrás</Button>
          <Button onClick={onNext} disabled={!g.isComplete}>Grower →</Button>
        </div>
      </div>
    </div>
  )
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px] sm:flex-none ${
        active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
      }`}
    >
      {icon}{label}
    </button>
  )
}

function AvailableRow({ employee, colorIdx, groups, onAdd }: {
  employee: Employee; colorIdx: number; groups: EmployeeGroup[]; onAdd: (groupId: string) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
      <Avatar name={employee.name} idx={colorIdx} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{employee.name}</p>
        <p className="text-xs text-muted-foreground">{employee.role}</p>
      </div>

      {/* ≤3 grupos: botones numéricos; >3 grupos: selector compacto */}
      {groups.length <= 3 ? (
        <div className="flex shrink-0 gap-1">
          {groups.map((g, i) => (
            <button key={g.id} type="button" onClick={() => onAdd(g.id)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
              title={`Agregar a ${g.name}`}>
              {i + 1}
            </button>
          ))}
        </div>
      ) : (
        <select
          defaultValue=""
          onChange={e => { if (e.target.value) { onAdd(e.target.value); e.target.value = '' } }}
          className="shrink-0 cursor-pointer appearance-none rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          title="Selecciona un grupo"
        >
          <option value="" disabled>+ Grupo</option>
          {groups.map((g, i) => (
            <option key={g.id} value={g.id}>{i + 1} — {g.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}

function GroupCard({ group, onRemove }: { group: EmployeeGroup; onRemove: (empId: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{group.name}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {group.employees.length}
        </span>
      </div>
      {group.employees.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">Sin empleados asignados</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {group.employees.map((emp, idx) => (
            <div key={emp.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <Avatar name={emp.name} idx={idx} />
                <div>
                  <p className="text-sm font-medium text-foreground">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role}</p>
                </div>
              </div>
              <button type="button" onClick={() => onRemove(emp.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}