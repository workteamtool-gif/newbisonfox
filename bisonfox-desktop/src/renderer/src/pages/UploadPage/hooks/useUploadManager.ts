import { useState, useEffect, useRef, useCallback } from 'react'
import { clientLogger } from '@renderer/utils/logger'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { uploadApi } from '@renderer/services/uploadApi'
import { UploadPhase } from '@renderer/entites/Upload'
import { DiskSession } from '@shared/entities/DiskSession'
import { WizardStep, AnotherDiskPage } from '@renderer/entites/Wizard'
import { FailedFile } from '@shared/entities/FailedFile'

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
  failedFilesList: FailedFile[]
  completedBytes: number
  totalBytes: number
  startUpload: () => void
  retryFailed: () => void
  retryAll: () => void
  skipFailed: () => void
  setStep: (step: WizardStep) => void
} {
  const {
    sessionId,
    currentDisk,
    setStep,
    setUploadDone,
    setCompletedFiles,
    uploadDone,
    username
  } = useWizardStore()

  const [phase, setPhase] = useState<UploadPhase>('ready')
  const [totalDiscovered, setTotalDiscovered] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [overallPercentage, setOverallPercentage] = useState(0)
  const [completedBytesState, setCompletedBytesState] = useState(0)
  const [totalBytesState, setTotalBytesState] = useState(0)
  const [failedFilesList, setFailedFilesList] = useState<FailedFile[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [accumulatedCopied, setAccumulatedCopied] = useState(0)

  const [preCalcTotal, setPreCalcTotal] = useState<number | null>(null)
  const [preCalcTotalBytes, setPreCalcTotalBytes] = useState<number | null>(null)
  const [countingComplete, setCountingComplete] = useState(false)

  const completedRef = useRef(0)
  const failedRef = useRef(0)
  const totalRef = useRef(0)

  const completedBytesRef = useRef(0)
  const totalBytesRef = useRef(0)

  const recalcPct = useCallback(() => {
    if (totalBytesRef.current > 0) {
      setOverallPercentage(Math.floor((completedBytesRef.current / totalBytesRef.current) * 100))
    }
  }, [])

  // Pre-calculate total files
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
          currentDisk.selectedItemPaths,
          currentDisk.excludedItemPaths ?? [],
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
        .catch(() => {})
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [currentDisk, phase, sessionId, username])

  // Effect to log copy progress every minute
  useEffect(() => {
    if (phase !== 'copying') return

    const intervalId = setInterval(() => {
      clientLogger.info(
        'UploadManager',
        `Copy in progress: ${completedRef.current} files copied so far.`
      )
    }, 60000) // 1 minute

    return () => clearInterval(intervalId)
  }, [phase])

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
        if (msg.totalBytes !== undefined && msg.totalBytes > 0)
          totalBytesRef.current = msg.totalBytes

        setCompletedCount(completedRef.current)
        setFailedCount(failedRef.current)
        setCompletedBytesState(completedBytesRef.current)
        setTotalBytesState(totalBytesRef.current)
        recalcPct()
      } else if (msg.type === 'sync') {
        if (msg.completed !== undefined) completedRef.current = msg.completed
        if (msg.failed !== undefined) failedRef.current = msg.failed
        if (msg.completedBytes !== undefined) completedBytesRef.current = msg.completedBytes
        if (msg.totalBytes !== undefined && msg.totalBytes > 0)
          totalBytesRef.current = msg.totalBytes

        setCompletedCount(accumulatedCopied + completedRef.current)
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
  }, [sessionId, phase, recalcPct, retryKey])

  const handleCompletion = (msg: any): void => {
    if (msg.failed !== undefined) failedRef.current = msg.failed
    setOverallPercentage(100)

    // Update byte stats from the done message so the final display is accurate
    if (msg.totalBytes !== undefined && msg.totalBytes > 0) {
      totalBytesRef.current = msg.totalBytes
      setTotalBytesState(msg.totalBytes)
    }
    if (msg.completedBytes !== undefined) {
      completedBytesRef.current = msg.completedBytes
      setCompletedBytesState(msg.completedBytes)
    }

    let finalCount = msg.completed ?? completedRef.current
    if (finalCount === 0 && totalRef.current > 0 && failedRef.current === 0) {
      finalCount = totalRef.current
    }

    const totalSuccess = accumulatedCopied + finalCount

    setCompletedCount(totalSuccess)
    setFailedCount(failedRef.current)
    setCompletedFiles(totalSuccess)

    const failed: FailedFile[] = msg.failedFiles || []
    setFailedFilesList(failed)

    useWizardStore.getState().updateLastDiskSession({
      copiedCount: totalSuccess,
      failedCount: failedRef.current,
      failedItems: failed
    })
    setUploadDone(true)

    if (failedRef.current === 0) {
      clientLogger.info('UploadManager', `Copied successfully ${finalCount} files.`)
      setTimeout(() => setStep(AnotherDiskPage), 1800)
    } else {
      const top3Failed = failed
        .slice(0, 3)
        .map((f) => `${f.path} (REASON: ${f.reason})`)
        .join(', ')
      clientLogger.error(
        'UploadManager',
        `Copy failed for ${failedRef.current} files and ${finalCount} copied successfully. Failed examples: ${top3Failed}.`
      )
    }
  }

  const startUpload = (): void => {
    if (!sessionId || !currentDisk) return

    setUploadDone(false)
    setFailedFilesList([])
    setFailedCount(0)
    failedRef.current = 0
    setCompletedCount(0)
    completedRef.current = 0
    completedBytesRef.current = 0
    setCompletedBytesState(0)
    setOverallPercentage(0)
    setAccumulatedCopied(0)

    setPhase('copying')
    setTotalDiscovered(preCalcTotal || 0)
    totalRef.current = preCalcTotal || 0
    totalBytesRef.current = preCalcTotalBytes || 0
    setTotalBytesState(preCalcTotalBytes || 0)

    const subfolder = currentDisk.subfolder || ''
    uploadApi
      .startUpload(sessionId, currentDisk.selectedItemPaths, subfolder, preCalcTotalBytes || 0)
      .catch((err: any) => {
        clientLogger.error('UploadManager', `Failed to upload.`, err)
        setUploadError(err.message || 'Failed to start upload.')
      })
  }

  const retryFailed = (): void => {
    if (!sessionId || !currentDisk || failedFilesList.length === 0) return

    const filesToRetry = failedFilesList.map((failedFile) => failedFile.path)

    const retryTotalBytes = failedFilesList.reduce(
      (sum, failedFile) => sum + (failedFile.sizeInBytes ?? 0),
      0
    )
    clientLogger.info(
      'UploadManager',
      `User decided to retry copying for ${filesToRetry.length} failed files (${retryTotalBytes} bytes).`
    )

    setUploadDone(false)
    setFailedFilesList([])
    setFailedCount(0)
    failedRef.current = 0
    const newAccumulated = accumulatedCopied + completedRef.current
    setAccumulatedCopied(newAccumulated)
    setCompletedCount(newAccumulated)
    completedRef.current = 0
    completedBytesRef.current = 0
    setCompletedBytesState(0)
    setOverallPercentage(0)
    totalRef.current = filesToRetry.length
    totalBytesRef.current = retryTotalBytes
    setTotalBytesState(retryTotalBytes)
    setTotalDiscovered(filesToRetry.length)
    setRetryKey((prevKey) => prevKey + 1)
    setPhase('copying')

    const subfolder = currentDisk.subfolder || ''
    uploadApi.startUpload(sessionId, filesToRetry, subfolder, retryTotalBytes).catch((err: any) => {
      clientLogger.error('UploadManager', `Retry failed.`, err)
      setUploadError(err.message || 'Retry failed.')
    })
  }

  const skipFailed = (): void => {
    clientLogger.info('UploadManager', `Skipping ${failedFilesList.length} failed file(s).`)
    setStep(AnotherDiskPage)
  }

  const retryAll = (): void => {
    if (!sessionId || !currentDisk) return

    clientLogger.info(
      'UploadManager',
      `Retrying ALL ${currentDisk.selectedItemPaths.length} original files (failures exceeded tracking limit).`
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
    setAccumulatedCopied(0)
    setTotalDiscovered(preCalcTotal || currentDisk.selectedItemPaths.length)
    totalRef.current = preCalcTotal || currentDisk.selectedItemPaths.length
    totalBytesRef.current = preCalcTotalBytes || 0
    setTotalBytesState(preCalcTotalBytes || 0)
    setRetryKey((k) => k + 1)
    setPhase('copying')

    const subfolder = currentDisk.subfolder || ''
    uploadApi
      .startUpload(sessionId, currentDisk.selectedItemPaths, subfolder, preCalcTotalBytes || 0)
      .catch((err: any) => {
        clientLogger.error('UploadManager', `Retry-all failed.`, err)
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
