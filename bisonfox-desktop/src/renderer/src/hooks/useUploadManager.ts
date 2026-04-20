import { useState, useEffect, useRef, useCallback } from 'react'
import { clientLogger } from '@renderer/utils/logger'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { uploadApi } from '@renderer/services/uploadApi'
import { UploadPhase } from '@renderer/entites/Upload'
import { DiskSession } from '@shared/entities/DiskSession'
import { WizardStep } from '@renderer/entites/Wizard'
import { PullDiskPage } from '@renderer/entites/Wizard'

export function useUploadManager(): {
  phase: UploadPhase
  uploadError: string | null
  uploadDone: boolean
  preCalcTotal: number | null
  countingComplete: boolean
  totalDiscovered: number
  completedCount: number
  failedCount: number
  overallPercentage: number
  currentDisk: DiskSession | null
  failedFilesList: { path: string; reason: string }[]
  completedBytes: number
  totalBytes: number
  startUpload: () => void
  retryFailed: () => void
  retryAll: () => void
  skipFailed: () => void
  setStep: (step: WizardStep) => void
} {
  const { sessionId, currentDisk, setStep, setUploadDone, setCompletedFiles, uploadDone, userName } =
    useWizardStore()

  const [phase, setPhase] = useState<UploadPhase>('ready')
  const [totalDiscovered, setTotalDiscovered] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [overallPercentage, setOverallPercentage] = useState(0)
  const [completedBytesState, setCompletedBytesState] = useState(0)
  const [totalBytesState, setTotalBytesState] = useState(0)
  const [failedFilesList, setFailedFilesList] = useState<{ path: string; reason: string }[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [preCalcTotal, setPreCalcTotal] = useState<number | null>(null)
  const [preCalcTotalBytes, setPreCalcTotalBytes] = useState<number | null>(null)
  const [countingComplete, setCountingComplete] = useState(false)

  // Stable refs for SSE callbacks
  const completedRef = useRef(0)
  const failedRef = useRef(0)
  const totalRef = useRef(0)

  const completedBytesRef = useRef(0)
  const totalBytesRef = useRef(0)

  const recalcPct = useCallback(() => {
    if (totalBytesRef.current > 0) {
      setOverallPercentage(
        Math.floor((completedBytesRef.current / totalBytesRef.current) * 100)
      )
    }
  }, [])

  // Effect 1: Pre-calculate total files
  useEffect(() => {
    if (!currentDisk || phase !== 'ready') return

    let cancelled = false
    const controller = new AbortController()

    setCountingComplete(false)
    setPreCalcTotal(0)
    setPreCalcTotalBytes(0)

    const timeoutId = setTimeout(() => {
      if (cancelled) return
      uploadApi
        .countFiles(
          sessionId,
          currentDisk.selectedFiles,
          currentDisk.excludedFiles ?? [],
          controller.signal,
          (count, size) => {
            if (!cancelled) {
              setPreCalcTotal(count)
              setPreCalcTotalBytes(size)
            }
          }
        )
        .then(({ count, size }) => {
          if (!cancelled) {
            setPreCalcTotal(count)
            setPreCalcTotalBytes(size)
            setCountingComplete(true)
          }
        })
        .catch(() => {
          /* Ignore aborts */
        })
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [currentDisk, phase, sessionId, userName])

  // Effect to log copy progress every minute
  useEffect(() => {
    if (phase !== 'copying') return

    const intervalId = setInterval(() => {
      clientLogger.info(
        'UploadManager',
        `For user: ${userName} in session: ${sessionId} copy in progress: ${completedRef.current} files copied so far.`
      )
    }, 60000) // 1 minute

    return () => clearInterval(intervalId)
  }, [phase, sessionId, userName])

  useEffect(() => {
    if (!sessionId || phase === 'ready') return

    let closed = false
    const controller = uploadApi.subscribeProgress(sessionId, (msg) => {
      if (closed) return

      if (msg.type === 'progress' && msg.file) {
        setPhase('copying')
        if (msg.completed !== undefined) completedRef.current = msg.completed
        if (msg.failed !== undefined) failedRef.current = msg.failed
        if (msg.completedBytes !== undefined) completedBytesRef.current = msg.completedBytes
        if (msg.totalBytes !== undefined && msg.totalBytes > 0) totalBytesRef.current = msg.totalBytes

        setCompletedCount(completedRef.current)
        setFailedCount(failedRef.current)
        setCompletedBytesState(completedBytesRef.current)
        setTotalBytesState(totalBytesRef.current)
        recalcPct()
      } else if (msg.type === 'sync') {
        if (msg.completed !== undefined) completedRef.current = msg.completed
        if (msg.failed !== undefined) failedRef.current = msg.failed
        if (msg.completedBytes !== undefined) completedBytesRef.current = msg.completedBytes
        if (msg.totalBytes !== undefined && msg.totalBytes > 0) totalBytesRef.current = msg.totalBytes

        setCompletedCount(completedRef.current)
        setFailedCount(failedRef.current)
        setCompletedBytesState(completedBytesRef.current)
        setTotalBytesState(totalBytesRef.current)

        if (totalBytesRef.current > 0) {
          setOverallPercentage(
            Math.floor(((msg.completedBytes ?? 0) / totalBytesRef.current) * 100)
          )
          setPhase('copying')
        }

        if (msg.status === 'complete') handleCompletion(msg)
      } else if (msg.type === 'done') {
        handleCompletion(msg)
      } else if (msg.type === 'error') {
        setUploadError(msg.message ?? 'Unknown upload error.')
      }
    })

    return () => {
      closed = true
      controller.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, phase, recalcPct, retryKey])

  const handleCompletion = (msg: any): void => {
    if (msg.failed !== undefined) failedRef.current = msg.failed
    setOverallPercentage(100)

    let finalCount = msg.completed ?? completedRef.current
    if (finalCount === 0 && totalRef.current > 0 && failedRef.current === 0) {
      finalCount = totalRef.current
    }

    setCompletedCount(finalCount)
    setFailedCount(failedRef.current)
    setCompletedFiles(finalCount)

    const failed: { path: string; reason: string }[] = msg.failedFiles || []
    setFailedFilesList(failed)

    useWizardStore
      .getState()
      .updateLastDiskSession({
        copiedCount: finalCount,
        failedCount: failedRef.current,
        failedFiles: failed
      })
    setUploadDone(true)

    // Only auto-navigate if there are NO failures
    if (failedRef.current === 0) {
      clientLogger.info(
        'UploadManager',
        `For user: ${userName} in session: ${sessionId} copied successfully ${finalCount} files.`
      )
      setTimeout(() => setStep(PullDiskPage), 1800)
    } else {
      const top3Failed = failed
        .slice(0, 3)
        .map((f) => `${f.path} (Reason: ${f.reason})`)
        .join(', ')
      clientLogger.error(
        'UploadManager',
        `For user: ${userName} in session: ${sessionId} copy failed for ${failedRef.current} files and ${finalCount} copied successfully.
         Failed examples: ${top3Failed}.`
      )
    }
  }

  const startUpload = (): void => {
    if (!sessionId || !currentDisk) return

    // Reset any leftover state from a previous upload session
    setUploadDone(false)
    setFailedFilesList([])
    setFailedCount(0)
    failedRef.current = 0
    setCompletedCount(0)
    completedRef.current = 0
    setOverallPercentage(0)

    setPhase('copying')
    setTotalDiscovered(preCalcTotal || 0)
    totalRef.current = preCalcTotal || 0
    totalBytesRef.current = preCalcTotalBytes || 0
    setTotalBytesState(preCalcTotalBytes || 0)

    const subfolder = currentDisk.subfolder || ''
    uploadApi.startUpload(sessionId, currentDisk.selectedFiles, subfolder, preCalcTotalBytes || 0).catch((err: any) => {
      clientLogger.error(
        'UploadManager',
        `For user: ${userName} in session: ${sessionId} failed to upload.`,
        err
      )
      setUploadError(err.message || 'Failed to start upload.')
    })
  }

  const retryFailed = (): void => {
    if (!sessionId || !currentDisk || failedFilesList.length === 0) return

    const filesToRetry = failedFilesList.map((f) => f.path)
    clientLogger.info(
      'UploadManager',
      `For user: ${userName} in session: ${sessionId} user decided to retry copying for ${filesToRetry.length} failed files.`
    )

    // Reset state for the retry round
    setUploadDone(false)
    setFailedFilesList([])
    setFailedCount(0)
    failedRef.current = 0
    setCompletedCount(0)
    completedRef.current = 0
    setOverallPercentage(0)
    setTotalDiscovered(filesToRetry.length)
    totalRef.current = filesToRetry.length
    totalBytesRef.current = 0
    setRetryKey((k) => k + 1)
    setPhase('copying')

    const subfolder = currentDisk.subfolder || ''
    uploadApi.startUpload(sessionId, filesToRetry, subfolder, 0).catch((err: any) => {
      clientLogger.error(
        'UploadManager',
        `For user: ${userName} in session: ${sessionId} retry failed.`,
        err
      )
      setUploadError(err.message || 'Retry failed.')
    })
  }

  const skipFailed = (): void => {
    clientLogger.info(
      'UploadManager',
      `For user: ${userName} in session: ${sessionId} skipping ${failedFilesList.length} failed file(s).`
    )
    setStep(PullDiskPage)
  }

  const retryAll = (): void => {
    if (!sessionId || !currentDisk) return

    clientLogger.info(
      'UploadManager',
      `For user: ${userName} in session: ${sessionId} retrying ALL ${currentDisk.selectedFiles.length} original files (failures exceeded tracking limit).`
    )

    // Reset state completely
    setUploadDone(false)
    setFailedFilesList([])
    setFailedCount(0)
    failedRef.current = 0
    setCompletedCount(0)
    completedRef.current = 0
    completedBytesRef.current = 0
    setCompletedBytesState(0)
    setOverallPercentage(0)
    setTotalDiscovered(preCalcTotal || currentDisk.selectedFiles.length)
    totalRef.current = preCalcTotal || currentDisk.selectedFiles.length
    totalBytesRef.current = preCalcTotalBytes || 0
    setTotalBytesState(preCalcTotalBytes || 0)
    setRetryKey((k) => k + 1)
    setPhase('copying')

    const subfolder = currentDisk.subfolder || ''
    uploadApi.startUpload(sessionId, currentDisk.selectedFiles, subfolder, preCalcTotalBytes || 0).catch((err: any) => {
      clientLogger.error(
        'UploadManager',
        `For user: ${userName} in session: ${sessionId} retry-all failed.`,
        err
      )
      setUploadError(err.message || 'Retry all failed.')
    })
  }

  return {
    phase,
    uploadError,
    uploadDone,
    preCalcTotal,
    countingComplete,
    totalDiscovered,
    completedCount,
    failedCount,
    overallPercentage,
    currentDisk,
    failedFilesList,
    completedBytes: completedBytesState,
    totalBytes: totalBytesState,
    startUpload,
    retryFailed,
    retryAll,
    skipFailed,
    setStep
  }
}
