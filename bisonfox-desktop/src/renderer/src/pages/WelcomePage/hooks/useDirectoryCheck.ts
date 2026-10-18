import { useCallback, useEffect, useState } from 'react'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { FailedDir } from '@shared/entities/FailedDir'

type CheckStatus = 'idle' | 'checking' | 'ok' | 'error'

export interface DirectoryCheckResult {
  status: CheckStatus
  hasError: boolean
  isReady: boolean
  failedDirNames: string[]
  recheck: () => void
}

/**
 * Checks whether all critical server directories are accessible via IPC.
 * Runs automatically on mount and exposes a `recheck` callback for manual retries.
 */
export function useDirectoryCheck(): DirectoryCheckResult {
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [failedDirNames, setFailedDirNames] = useState<string[]>([])

  const recheck = useCallback(async () => {
    setStatus('checking')
    try {
      const failed = (await window.api.invoke(IPC_CHANNELS.SYSTEM.CHECK_DIRS)) as FailedDir[]
      setFailedDirNames(failed?.map((d) => d.name) ?? [])
      setStatus(failed?.length > 0 ? 'error' : 'ok')
    } catch {
      setFailedDirNames([])
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    recheck()
  }, [recheck])

  return {
    status,
    hasError: status === 'error',
    isReady: status === 'ok',
    failedDirNames,
    recheck
  }
}
