import { useCallback, useEffect, MutableRefObject } from 'react'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { driveApi } from '@renderer/services/driveApi'
import { useWizardStore } from '@renderer/store/useWizardStore'

interface UseTreeSearchOptions {
  nodePath: string
  loading: boolean
  expanded: boolean
  page: number
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<ItemNode[]>>
  autoExpandMap?: Record<string, number>
  onAutoExpand?: (map: Record<string, number>, targetPath?: string) => void
  lastAutoExpandRef: MutableRefObject<Record<string, number> | null>
  setLoading: (b: boolean) => void
  setExpanded: (b: boolean) => void
  loadPage: (targetPage: number) => Promise<PaginatedResult<ItemNode[]>>
}

export function useTreeSearch({
  nodePath,
  loading,
  expanded,
  page,
  onLoadChildren,
  autoExpandMap,
  onAutoExpand,
  lastAutoExpandRef,
  setLoading,
  setExpanded,
  loadPage
}: UseTreeSearchOptions) {
  const handleSearchSubmit = useCallback(
    async (query: string): Promise<void> => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery || loading) return
      setLoading(true)
      useWizardStore.getState().setToast(`מחפש בכונן החיצוני קובץ או תיקייה`, 'info')

      try {
        const targetPage = await driveApi.findItemPage(nodePath, trimmedQuery)
        if (targetPage !== null) {
          const res = await loadPage(targetPage)

          const match = res.nodes.find((n) =>
            n.name.toLowerCase().includes(trimmedQuery.toLowerCase())
          )
          if (match && onAutoExpand) {
            onAutoExpand(autoExpandMap || {}, match.path)
            useWizardStore.getState().setToast(`נמצא! פותח את נתיב התיקייה כעת.`, 'success')
          } else {
            useWizardStore.getState().setToast(`נמצאה התאמה! מציג עמוד ${targetPage}.`, 'info')
          }
        } else {
          const deepMatch = await driveApi.deepFindItem(nodePath, trimmedQuery)
          if (deepMatch) {
            useWizardStore.getState().setToast(`נמצא! פותח את נתיב התיקייה כעת.`, 'success')
            if (onAutoExpand) onAutoExpand(deepMatch.pages, deepMatch.path)
          } else {
            useWizardStore
              .getState()
              .setToast(`לא הצלחנו למצוא קובץ או תיקייה בשם זה בכונן.`, 'warning')
          }
        }
      } catch {
        useWizardStore.getState().setToast('אופס, אירעה שגיאה במהלך החיפוש.', 'error')
      } finally {
        setLoading(false)
      }
    },
    [nodePath, loading, onAutoExpand, autoExpandMap, loadPage, setLoading]
  )

  // Auto-expand effect
  useEffect(() => {
    if (autoExpandMap && autoExpandMap[nodePath] !== undefined) {
      if (lastAutoExpandRef.current === autoExpandMap) return
      lastAutoExpandRef.current = autoExpandMap

      const targetPage = autoExpandMap[nodePath]
      if (!expanded || page !== targetPage) {
        setLoading(true)
        onLoadChildren(nodePath, targetPage)
          .then(() => {
            loadPage(targetPage)
            setExpanded(true)
            setLoading(false)
          })
          .catch(() => setLoading(false))
      }
    }
  }, [
    autoExpandMap,
    nodePath,
    expanded,
    page,
    onLoadChildren,
    lastAutoExpandRef,
    setLoading,
    setExpanded,
    loadPage
  ])

  return { handleSearchSubmit }
}
