import { useState, useEffect, useRef, useCallback } from 'react'
import { clientLogger } from '@renderer/utils/logger'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { uploadApi } from '@renderer/services/uploadApi'
import { UploadPhase } from '@renderer/entites/Upload'
import { DiskSession } from '@shared/entities/DiskSession'
import { WizardStep } from '@renderer/entites/Wizard'

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
  startUpload: () => void
  setStep: (step: WizardStep) => void
} {
  const { sessionId, currentDisk, setStep, setUploadDone, setCompletedFiles, uploadDone } =
    useWizardStore()

  const [phase, setPhase] = useState<UploadPhase>('ready')
  const [totalDiscovered, setTotalDiscovered] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [overallPercentage, setOverallPercentage] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [preCalcTotal, setPreCalcTotal] = useState<number | null>(null)
  const [countingComplete, setCountingComplete] = useState(false)

  // Stable refs for SSE callbacks
  const completedRef = useRef(0)
  const failedRef = useRef(0)
  const totalRef = useRef(0)

  const recalcPct = useCallback(() => {
    if (totalRef.current > 0) {
      setOverallPercentage(
        Math.round(((completedRef.current + failedRef.current) / totalRef.current) * 100)
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

    uploadApi
      .countFiles(
        currentDisk.selectedFiles,
        currentDisk.excludedFiles ?? [],
        controller.signal,
        (count) => {
          if (!cancelled) setPreCalcTotal(count)
        }
      )
      .then((count) => {
        if (!cancelled) {
          setPreCalcTotal(count)
          setCountingComplete(true)
        }
      })
      .catch(() => {
        /* Ignore aborts */
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [currentDisk, phase])

  useEffect(() => {
    if (!sessionId || phase === 'ready') return

    let closed = false
    const controller = uploadApi.subscribeProgress(sessionId, (msg) => {
      if (closed) return

      if (msg.type === 'progress' && msg.file) {
        setPhase('copying')
        if (msg.completed !== undefined) completedRef.current = msg.completed
        if (msg.failed !== undefined) failedRef.current = msg.failed

        setCompletedCount(completedRef.current)
        setFailedCount(failedRef.current)
        recalcPct()
      } else if (msg.type === 'sync') {
        if (msg.completed !== undefined) completedRef.current = msg.completed
        if (msg.failed !== undefined) failedRef.current = msg.failed

        setCompletedCount(completedRef.current)
        setFailedCount(failedRef.current)

        if (totalRef.current > 0) {
          setOverallPercentage(
            Math.round((((msg.completed ?? 0) + (msg.failed ?? 0)) / totalRef.current) * 100)
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
  }, [sessionId, phase, recalcPct])

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

    useWizardStore
      .getState()
      .updateLastDiskSession({ copiedCount: finalCount, failedFiles: msg.failedFiles })
    setUploadDone(true)
    setTimeout(() => setStep('pull-disk'), 1800)
  }

  const startUpload = (): void => {
    if (!sessionId || !currentDisk) return

    clientLogger.info('UploadManager', 'Initiating upload sequence...')
    setPhase('copying')
    setTotalDiscovered(preCalcTotal || 0)
    totalRef.current = preCalcTotal || 0

    const subfolder = currentDisk.subfolder || ''
    uploadApi.startUpload(sessionId, currentDisk.selectedFiles, subfolder).catch((err: any) => {
      clientLogger.error('UploadManager', 'Failed to upload', err)
      setUploadError(err.message || 'Failed to start upload.')
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
    startUpload,
    setStep
  }
}
