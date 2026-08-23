import { useState, useCallback } from 'react'
import { isSubPath } from '@renderer/utils/paths'

export function useTreeSelection(initialSelected: string[] = [], initialExcluded: string[] = []) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [excluded, setExcluded] = useState<Set<string>>(new Set(initialExcluded))

  const handleToggleSelect = useCallback(
    (path: string, _isDir: boolean, isExcluded: boolean, isInherited: boolean) => {
      if (isExcluded) {
        setExcluded((prev) => {
          const updatedSet = new Set(prev)
          updatedSet.delete(path)
          return updatedSet
        })
      } else if (isInherited) {
        setExcluded((prev) => new Set([...prev, path]))
      } else {
        setSelected((prev) => {
          const updatedSet = new Set(prev)
          if (updatedSet.has(path)) updatedSet.delete(path)
          else updatedSet.add(path)

          for (const selectedPath of updatedSet) {
            if (selectedPath !== path && isSubPath(path, selectedPath)) {
              updatedSet.delete(selectedPath)
            }
          }
          return updatedSet
        })

        setExcluded((prev) => {
          const updatedSet = new Set(prev)
          let changed = false
          for (const excludedPath of updatedSet) {
            if (excludedPath === path || isSubPath(path, excludedPath)) {
              updatedSet.delete(excludedPath)
              changed = true
            }
          }
          return changed ? updatedSet : prev
        })
      }
    },
    []
  )

  return {
    selected,
    setSelected,
    excluded,
    setExcluded,
    handleToggleSelect
  }
}
