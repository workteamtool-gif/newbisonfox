import { useEffect } from 'react'
import { driveApi } from '@renderer/services/driveApi'
import { getConfig } from '@renderer/services/configService'

interface UseTreePageCountOptions {
  nodePath: string
  expanded: boolean
  totalPages: number
  setTotalPages: (n: number) => void
  setCountLoading: (b: boolean) => void
}

export function useTreePageCount({
  nodePath,
  expanded,
  totalPages,
  setTotalPages,
  setCountLoading
}: UseTreePageCountOptions) {
  useEffect(() => {
    let isCancelled = false

    if (totalPages === -1 && expanded) {
      setCountLoading(true)
      driveApi
        .getDirCount(nodePath)
        .then((count) => {
          if (!isCancelled) {
            getConfig()
              .then((config) => {
                if (!isCancelled) {
                  const limit = config.itemsInOnePage || 48
                  setTotalPages(Math.max(1, Math.ceil(count / limit)))
                  setCountLoading(false)
                }
              })
              .catch((err) => {
                if (!isCancelled) {
                  console.error('Failed to load config for tree page count', err)
                  setCountLoading(false)
                }
              })
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setTotalPages(1)
            setCountLoading(false)
          }
        })
    }

    return () => {
      isCancelled = true
    }
  }, [totalPages, expanded, nodePath, setTotalPages, setCountLoading])
}
