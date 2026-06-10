import { useTranslation } from 'react-i18next'
import { Search, X, Users, User, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { Employee, EmployeeGroup } from './types'
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

function Avatar({ name, idx, sm }: { name: string; idx: number; sm?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${COLORS[idx % COLORS.length]} ${
      sm ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-xs'
    }`}>
      {initials(name)}
    </span>
  )
}

export function Step2Employees({ totalEmployees, groups: g, onBack, onNext }: Props) {
  const { t } = useTranslation()
  const totalAssigned = g.groups.reduce((sum, gr) => sum + gr.employees.length, 0)
  const activeGroups  = g.groups.filter(gr => gr.employees.length > 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Mode toggle + group count */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full rounded-lg border border-border sm:w-auto">
          <ModeBtn active={g.mode === 'groups'}     onClick={() => g.setMode('groups')}     icon={<Users className="h-4 w-4" />} label={t('productivity.step2.modeGroups')} />
          <ModeBtn active={g.mode === 'individual'} onClick={() => g.setMode('individual')} icon={<User  className="h-4 w-4" />} label={t('productivity.step2.modeIndividual')} />
        </div>

        {g.mode === 'groups' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t('productivity.step2.groupsLabel')}</span>
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[420px_1fr]">

        {/* ── Available employees — sticky sidebar ── */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('productivity.step2.available')}
            </p>
            <span className="text-xs font-medium text-muted-foreground">
              {g.available.length}/{totalEmployees}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('productivity.step2.searchEmployee')}
              value={g.searchQuery}
              onChange={e => g.setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {g.filteredAvailable.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {g.searchQuery ? t('productivity.step2.noSearchResults') : t('productivity.step2.allAssigned')}
              </p>
            ) : (
              g.filteredAvailable.map((emp, idx) => (
                <AvailableRow
                  key={emp.id}
                  employee={emp}
                  colorIdx={idx}
                  mode={g.mode}
                  groups={g.groups}
                  onAdd={groupId => g.addToGroup(emp, groupId)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel — groups (contained cards) or individuals (separate mini-cards) ── */}
        {g.mode === 'groups' ? (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            {g.groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                onRemove={(empId) => g.removeFromGroup(empId, group.id)}
              />
            ))}
          </div>
        ) : (
          <IndividualGrid
            employees={g.groups[0]?.employees ?? []}
            onRemove={(empId) => g.removeFromGroup(empId, 'individual')}
          />
        )}
      </div>

      {/* Bottom summary bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{totalAssigned}</strong> {t('productivity.step2.assigned')}</span>
          <span><strong className="text-foreground">{g.available.length}</strong> {t('productivity.step2.availableCount')}</span>
          {g.mode === 'groups' && (
            <>
              <span>{t('productivity.step2.activeGroups')} <strong className="text-foreground">{activeGroups.length}</strong></span>
              {activeGroups.length > 0 && (
                <span>
                  {t('productivity.step2.range')}{' '}
                  <strong className="text-foreground">
                    {t('productivity.step2.perGroup', {
                      min: Math.min(...activeGroups.map(gr => gr.employees.length)),
                      max: Math.max(...activeGroups.map(gr => gr.employees.length)),
                    })}
                  </strong>
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>{t('productivity.common.back')}</Button>
          <Button onClick={onNext} disabled={!g.isComplete}>{t('productivity.step2.next')}</Button>
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

function AvailableRow({ employee, colorIdx, mode, groups, onAdd }: {
  employee: Employee; colorIdx: number; mode: 'groups' | 'individual'; groups: EmployeeGroup[]; onAdd: (groupId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
      <Avatar name={employee.name} idx={colorIdx} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{employee.name}</p>
        <p className="text-xs text-muted-foreground">{employee.role}</p>
      </div>

      {mode === 'individual' ? (
        // Individual: a single "+" — the person becomes its own unit (no group number).
        <button
          type="button"
          onClick={() => onAdd('individual')}
          title={t('productivity.step2.addIndividual')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : groups.length <= 5 ? (
        <TooltipProvider>
          <div className="flex shrink-0 gap-1">
            {groups.map((g, i) => (
              <Tooltip key={g.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onAdd(g.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">
                    {i + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{g.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="group shrink-0 gap-1.5">
              {t('productivity.step2.group')}
              <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-150 group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 min-w-[120px] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map(g => (
              <DropdownMenuItem key={g.id} onSelect={() => onAdd(g.id)}>
                {g.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function GroupCard({ group, onRemove }: { group: EmployeeGroup; onRemove: (empId: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{group.name}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {group.employees.length}
        </span>
      </div>

      {group.employees.length === 0 ? (
        <p className="py-1.5 text-center text-xs text-muted-foreground">{t('productivity.step2.noEmployees')}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {group.employees.map((emp, idx) => (
            <div key={emp.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Avatar name={emp.name} idx={idx} sm />
                <p className="truncate text-xs font-medium text-foreground">{emp.name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(emp.id)}
                className="ml-1 h-5 w-5 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Individual mode: each employee is its OWN separate card (= one independent unit/TRX),
// so it never reads like a single group.
function IndividualGrid({ employees, onRemove }: { employees: Employee[]; onRemove: (empId: string) => void }) {
  const { t } = useTranslation()

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('productivity.step2.individualEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {employees.map((emp, idx) => (
        <div key={emp.id} className="relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 pt-4 text-center shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(emp.id)}
            className="absolute right-1 top-1 h-5 w-5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <X className="h-3 w-3" />
          </Button>
          <Avatar name={emp.name} idx={idx} />
          <div className="min-w-0 w-full">
            <p className="truncate text-xs font-medium text-foreground">{emp.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{emp.role}</p>
          </div>
        </div>
      ))}
    </div>
  )
}