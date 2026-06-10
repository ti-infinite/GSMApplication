import { useState, useCallback } from 'react'
import type { Employee, EmployeeGroup, AssignmentMode } from '../types'

interface UseEmployeeGroupsResult {
  mode:              AssignmentMode
  groups:            EmployeeGroup[]
  available:         Employee[]
  groupCount:        number
  searchQuery:       string
  filteredAvailable: Employee[]
  isComplete:        boolean
  setMode:           (mode: AssignmentMode) => void
  setGroupCount:     (count: number) => void
  setSearchQuery:    (q: string) => void
  addToGroup:        (employee: Employee, groupId: string) => void
  removeFromGroup:   (employeeId: string, groupId: string) => void
  reset:             () => void
}

function buildGroups(count: number): EmployeeGroup[] {
  return Array.from({ length: count }, (_, i) => ({
    id:        `group-${i + 1}`,
    name:      `Grupo ${i + 1}`,
    employees: [],
  }))
}

const INDIVIDUAL_GROUP: EmployeeGroup = { id: 'individual', name: 'Individual', employees: [] }

export function useEmployeeGroups(allEmployees: Employee[]): UseEmployeeGroupsResult {
  const [mode,        setModeState]  = useState<AssignmentMode>('groups')
  const [groupCount,  setGroupCount] = useState(2)
  const [searchQuery, setSearchQuery] = useState('')

  // Each mode stores its assignments independently — switching modes never loses data
  const [modeGroups, setModeGroups] = useState<Record<AssignmentMode, EmployeeGroup[]>>({
    groups:     buildGroups(2),
    individual: [{ ...INDIVIDUAL_GROUP }],
  })

  const groups = modeGroups[mode]

  const assigned         = groups.flatMap(g => g.employees.map(e => e.id))
  const available        = allEmployees.filter(e => !assigned.includes(e.id))
  const filteredAvailable = searchQuery.trim()
    ? available.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : available

  // Switching mode just changes the view — both modes retain their own assignments
  const setMode = useCallback((m: AssignmentMode) => {
    setModeState(m)
  }, [])

  const handleGroupCount = useCallback((count: number) => {
    if (count < 1) return
    setGroupCount(count)
    setModeGroups(prev => {
      const current = prev.groups
      if (count > current.length) {
        const extra = Array.from({ length: count - current.length }, (_, i) => ({
          id:        `group-${current.length + i + 1}`,
          name:      `Grupo ${current.length + i + 1}`,
          employees: [],
        }))
        return { ...prev, groups: [...current, ...extra] }
      }
      return { ...prev, groups: current.slice(0, count) }
    })
  }, [])

  const addToGroup = useCallback((employee: Employee, groupId: string) => {
    setModeGroups(prev => ({
      ...prev,
      [mode]: prev[mode].map(g =>
        g.id === groupId ? { ...g, employees: [...g.employees, employee] } : g,
      ),
    }))
  }, [mode])

  const removeFromGroup = useCallback((employeeId: string, groupId: string) => {
    setModeGroups(prev => ({
      ...prev,
      [mode]: prev[mode].map(g =>
        g.id === groupId
          ? { ...g, employees: g.employees.filter(e => e.id !== employeeId) }
          : g,
      ),
    }))
  }, [mode])

  const reset = useCallback(() => {
    setModeState('groups')
    setGroupCount(2)
    setModeGroups({ groups: buildGroups(2), individual: [{ ...INDIVIDUAL_GROUP }] })
    setSearchQuery('')
  }, [])

  const totalAssigned = groups.reduce((sum, g) => sum + g.employees.length, 0)

  return {
    mode,
    groups,
    available,
    groupCount,
    searchQuery,
    filteredAvailable,
    isComplete:    totalAssigned > 0,
    setMode,
    setGroupCount: handleGroupCount,
    setSearchQuery,
    addToGroup,
    removeFromGroup,
    reset,
  }
}