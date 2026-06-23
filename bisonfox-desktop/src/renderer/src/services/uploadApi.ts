import { clientLogger } from '@renderer/utils/logger'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { ProgressMessage } from '@renderer/entites/ProgressMessage'

export const uploadApi = {
  countFiles: async (
    sessionId: string,
    selectedPaths: string[],
    excludedPaths: string[],
    signal?: AbortSignal,
    onCount?: (c: number, s: number) => void
  ): Promise<{ count: number; size: number }> => {
    clientLogger.info(
      'API',
      `Starting background file count session (IPC) for session ${sessionId}...`
    )
    const scanId = Math.random().toString(36).substring(2, 10)

    return new Promise((resolve, reject) => {
      const channel = `${IPC_CHANNELS.UPLOAD.COUNT_PREFIX}${scanId}`

      const unsubscribe = window.api.on(channel, (data: any) => {
        if (data.error) {
          clientLogger.error('API', `File count stream error`, data.error)
          unsubscribe()
          reject(new Error(data.error))
        } else if (data.done) {
          clientLogger.info('API', `File count complete! Total: ${data.count}, Bytes: ${data.size}`)
          unsubscribe()
          resolve({ count: data.count ?? 0, size: data.size ?? 0 })
        } else if (data.count !== undefined && onCount) {
          onCount(data.count, data.size ?? 0)
        }
      })

      if (signal) {
        signal.addEventListener('abort', () => {
          window.api.invoke(IPC_CHANNELS.UPLOAD.CANCEL_COUNT, { scanId })
          unsubscribe()
          reject(new Error('Aborted'))
        })
      }

      window.api
        .invoke(IPC_CHANNELS.UPLOAD.START_COUNT, { scanId, selectedPaths, excludedPaths })
        .catch((err) => {
          unsubscribe()
          reject(err)
        })
    })
  },

  addDiskFiles: async (
    sessionId: string,
    driveLetter: string,
    selectedItems: string[],
    excludedItems: string[]
  ) => {
    return await window.api.invoke(IPC_CHANNELS.UPLOAD.ADD_DISK_FILES, {
      sessionId,
      driveLetter,
      selectedItems,
      excludedItems
    })
  },

  cancelSession: async (sessionId: string) => {
    clientLogger.warn('API', `Sending cancel signal for session ${sessionId}`)
    return await window.api.invoke(IPC_CHANNELS.UPLOAD.CANCEL, { sessionId })
  },

  startUpload: async (
    sessionId: string,
    files: string[],
    subfolder: string,
    expectedTotalBytes?: number
  ) => {
    clientLogger.info('API', `Sending Start Upload command for session ${sessionId}...`)
    return await window.api.invoke(IPC_CHANNELS.UPLOAD.START, {
      sessionId,
      files,
      subfolder,
      expectedTotal: files.length,
      expectedTotalBytes
    })
  },

  subscribeProgress: (
    sessionId: string,
    onMessage: (msg: ProgressMessage) => void
  ): { close: () => void } => {
    const channel = `${IPC_CHANNELS.UPLOAD.PROGRESS_PREFIX}${sessionId}`

    const unsubscribe = window.api.on(channel, (data: ProgressMessage) => {
      if (data.type === 'error') {
        onMessage({ type: 'error', message: data.message || 'Server error' })
      } else if (data.type === 'done') {
        onMessage({
          type: 'done',
          percent: 100,
          completed: data.completed,
          completedBytes: data.completedBytes,
          failed: data.failed,
          failedFiles: data.failedFiles || [],
          total: data.total,
          totalBytes: data.totalBytes
        })
        unsubscribe()
      } else if (data.type === 'discovery') {
        onMessage({ type: 'discovery', count: data.count, size: data.size })
      } else if (data.type === 'progress') {
        onMessage({
          type: 'progress',
          file: data.file,
          percent: data.percent,
          completed: data.completed,
          completedBytes: data.completedBytes,
          failed: data.failed,
          total: data.total,
          totalBytes: data.totalBytes
        })
      } else {
        onMessage({ ...data, type: data.type || 'sync' })
      }
    })

    return {
      close: () => {
        clientLogger.info('IPC', 'Closing upload stream manually.')
        unsubscribe()
      }
    }
  }
}
