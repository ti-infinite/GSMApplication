import { useTranslation } from 'react-i18next'
import { Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { Avatar } from '@/shared/ui/avatar'
import type { EmployeeGroup } from '../../model/types'
import type { Employee } from '@/entities/employee'

export function AvailableRow({ employee, colorIdx, mode, groups, onAdd, onAddIndividual }: {
  employee: Employee; colorIdx: number; mode: 'groups' | 'individual'; groups: EmployeeGroup[]
  onAdd: (groupId: string) => void; onAddIndividual: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
      <Avatar name={employee.name} colorIndex={colorIdx} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{employee.name}</p>
        <p className="text-xs text-muted-foreground">{employee.role}</p>
      </div>

      {mode === 'individual' ? (
        <button
          type="button"
          onClick={onAddIndividual}
          title={t('productivity.step2.addIndividual')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : groups.length <= 5 ? (
        <TooltipProvider>
          <div className="flex shrink-0 gap-1">
            {groups.map((gr, i) => (
              <Tooltip key={gr.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onAdd(gr.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">
                    {i + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{gr.name}</TooltipContent>
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
          <DropdownMenuContent align="end" className="max-h-64 min-w-[120px] overflow-y-auto scrollbar-hide">
            {groups.map(gr => (
              <DropdownMenuItem key={gr.id} onSelect={() => onAdd(gr.id)}>
                {gr.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
