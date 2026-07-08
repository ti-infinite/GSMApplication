import { useState, useCallback } from 'react'
import type { EmployeeGroup, AssignmentMode } from './types'
import type { Employee } from '@/entities/employee'

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
  addIndividual:     (employee: Employee) => void
  removeIndividual:  (groupId: string) => void
  setGroupProduct:   (groupId: string, productId: string) => void
  setGroupQty:       (groupId: string, qty: number) => void
  reset:             () => void
}

function buildGroups(count: number): EmployeeGroup[] {
  return Array.from({ length: count }, (_, i) => ({
    id:        `group-${i + 1}`,
    name:      `Grupo ${i + 1}`,
    employees: [],
  }))
}

export function useEmployeeGroups(allEmployees: Employee[]): UseEmployeeGroupsResult {
  const [mode,        setModeState]   = useState<AssignmentMode>('groups')
  const [groupCount,  setGroupCount]  = useState(2)
  const [searchQuery, setSearchQuery] = useState('')

  // Each mode stores its assignments independently — switching modes never loses data.
  // Groups mode: N predefined groups you fill. Individual mode: one single-person
  // mesa per added employee (each its own work table).
  const [modeGroups, setModeGroups] = useState<Record<AssignmentMode, EmployeeGroup[]>>({
    groups:     buildGroups(2),
    individual: [],
  })

  const groups = modeGroups[mode]

  const assigned          = groups.flatMap(g => g.employees.map(e => e.id))
  const available         = allEmployees.filter(e => !assigned.includes(e.id))
  const filteredAvailable = searchQuery.trim()
    ? available.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : available

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

  // Individual mode: one mesa per person.
  const addIndividual = useCallback((employee: Employee) => {
    setModeGroups(prev => ({
      ...prev,
      individual: [...prev.individual, { id: `ind-${employee.id}`, name: employee.name, employees: [employee] }],
    }))
  }, [])

  const removeIndividual = useCallback((groupId: string) => {
    setModeGroups(prev => ({
      ...prev,
      individual: prev.individual.filter(g => g.id !== groupId),
    }))
  }, [])

  const setGroupProduct = useCallback((groupId: string, productId: string) => {
    setModeGroups(prev => ({
      ...prev,
      [mode]: prev[mode].map(g => (g.id === groupId ? { ...g, productId } : g)),
    }))
  }, [mode])

  const setGroupQty = useCallback((groupId: string, qty: number) => {
    setModeGroups(prev => ({
      ...prev,
      [mode]: prev[mode].map(g => (g.id === groupId ? { ...g, qty } : g)),
    }))
  }, [mode])

  const reset = useCallback(() => {
    setModeState('groups')
    setGroupCount(2)
    setModeGroups({ groups: buildGroups(2), individual: [] })
    setSearchQuery('')
  }, [])

  // A mesa with people is "ready" only once it has a product + a positive qty.
  const nonEmptyGroups = groups.filter(g => g.employees.length > 0)
  const isComplete = nonEmptyGroups.length > 0 && nonEmptyGroups.every(g => !!g.productId && (g.qty ?? 0) > 0)

  return {
    mode,
    groups,
    available,
    groupCount,
    searchQuery,
    filteredAvailable,
    isComplete,
    setMode,
    setGroupCount: handleGroupCount,
    setSearchQuery,
    addToGroup,
    removeFromGroup,
    addIndividual,
    removeIndividual,
    setGroupProduct,
    setGroupQty,
    reset,
  }
}
