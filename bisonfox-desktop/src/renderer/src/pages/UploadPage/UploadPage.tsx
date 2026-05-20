import { useEffect } from 'react'
import { useUploadManager } from '@renderer/hooks/useUploadManager'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import loadingVideo from '@renderer/videos/uploadingvideo.mp4'
import { JSX } from 'react'
import { InsertDiskPage, ReviewPage } from '@renderer/entites/Wizard'
import { ErrorUpload } from './UploadPageComponents/ErrorUpload'
import { CountingUpload } from './UploadPageComponents/CountingUpload'
import { UploadComponent } from './UploadPageComponents/UploadComponent'

export function UploadPage(): JSX.Element | null {
  const {
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
    startUpload,
    retryFailed,
    retryAll,
    skipFailed,
    setStep,
    completedBytes,
    totalBytes
  } = useUploadManager()

  useDriveMonitor()

  useEffect(() => {
    if (!currentDisk) setStep(InsertDiskPage)
  }, [currentDisk, setStep])

  if (!currentDisk) return null

  const shown = totalDiscovered || preCalcTotal || currentDisk.selectedItemPaths.length
  const doneTotal = completedCount + failedCount

  const phaseLabel =
    phase === 'preparing'
      ? <>מכין...</>
      : phase === 'scanning'
        ? <>סורק... נמצאו {totalDiscovered.toLocaleString()} קבצים</>
        : <>מעתיק {totalDiscovered.toLocaleString()} / {doneTotal.toLocaleString()} קבצים</>

  // Show failed files review when upload is done AND there are failures
  const showFailedReview = uploadDone && failedFilesList.length > 0

  const MAX_FAILED_FILES_TO_SHOW = 20

  return (
    <div className="glass-card">
      {/* === SCENARIO 1: ERROR === */}
      {uploadError && (
        <ErrorUpload uploadError={uploadError} setStep={setStep} ReviewPage={ReviewPage} />
      )
      }

      {/* === SCENARIO 2: COUNTING === */}
      {
        !uploadError && phase === 'ready' && (
          <CountingUpload
            countingComplete={countingComplete}
            startUpload={startUpload}
            preCalcTotal={preCalcTotal} />
        )
      }

      {/* === SCENARIO 3: UPLOADING / DONE === */}
      {
        !uploadError && phase !== 'ready' && (
          <UploadComponent
            showFailedReview={showFailedReview}
            uploadDone={uploadDone}
            phaseLabel={phaseLabel}
            totalDiscovered={totalDiscovered}
            shown={shown}
            completedCount={completedCount}
            failedCount={failedCount}
            overallPercentage={overallPercentage}
            failedFilesList={failedFilesList}
            MAX_FAILED_FILES_TO_SHOW={MAX_FAILED_FILES_TO_SHOW}
            skipFailed={skipFailed}
            retryFailed={retryFailed}
            retryAll={retryAll}
            loadingVideo={loadingVideo}
            completedBytes={completedBytes}
            totalBytes={totalBytes}
          />)
      }
    </div >
  )
}
