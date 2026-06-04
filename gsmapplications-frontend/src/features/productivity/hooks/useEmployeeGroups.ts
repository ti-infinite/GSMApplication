import { useState, useCallback } from 'react'
import type { Employee, EmployeeGroup, AssignmentMode } from '../types'

interface UseEmployeeGroupsResult {
  mode:            AssignmentMode
  groups:          EmployeeGroup[]
  available:       Employee[]
  groupCount:      number
  searchQuery:     string
  filteredAvailable: Employee[]
  isComplete:      boolean
  setMode:         (mode: AssignmentMode) => void
  setGroupCount:   (count: number) => void
  setSearchQuery:  (q: string) => void
  addToGroup:      (employee: Employee, groupId: string) => void
  removeFromGroup: (employeeId: string, groupId: string) => void
  reset:           () => void
}

export function useEmployeeGroups(allEmployees: Employee[]): UseEmployeeGroupsResult {
  const [mode,         setModeState]  = useState<AssignmentMode>('groups')
  const [groupCount,   setGroupCount] = useState(2)
  const [groups,       setGroups]     = useState<EmployeeGroup[]>(() => buildGroups(2))
  const [searchQuery,  setSearchQuery] = useState('')

  function buildGroups(count: number): EmployeeGroup[] {
    return Array.from({ length: count }, (_, i) => ({
      id:        `group-${i + 1}`,
      name:      `Grupo ${i + 1}`,
      employees: [],
    }))
  }

  const assigned = groups.flatMap(g => g.employees.map(e => e.id))
  const available = allEmployees.filter(e => !assigned.includes(e.id))

  const filteredAvailable = searchQuery.trim()
    ? available.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : available

  const setMode = useCallback((m: AssignmentMode) => {
    setModeState(m)
    setGroups(m === 'individual' ? [{ id: 'individual', name: 'Individual', employees: [] }] : buildGroups(groupCount))
  }, [groupCount])

  const handleGroupCount = useCallback((count: number) => {
    if (count < 1) return
    setGroupCount(count)
    setGroups(prev => {
      if (count > prev.length) {
        const extra = Array.from({ length: count - prev.length }, (_, i) => ({
          id:        `group-${prev.length + i + 1}`,
          name:      `Grupo ${prev.length + i + 1}`,
          employees: [],
        }))
        return [...prev, ...extra]
      }
      // Move employees from removed groups back to available
      return prev.slice(0, count)
    })
  }, [])

  const addToGroup = useCallback((employee: Employee, groupId: string) => {
    setGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, employees: [...g.employees, employee] } : g),
    )
  }, [])

  const removeFromGroup = useCallback((employeeId: string, groupId: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, employees: g.employees.filter(e => e.id !== employeeId) } : g,
      ),
    )
  }, [])

  const reset = useCallback(() => {
    setModeState('groups')
    setGroupCount(2)
    setGroups(buildGroups(2))
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
    isComplete:      totalAssigned > 0,
    setMode,
    setGroupCount:   handleGroupCount,
    setSearchQuery,
    addToGroup,
    removeFromGroup,
    reset,
  }
}