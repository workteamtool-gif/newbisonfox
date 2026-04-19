import { useEffect } from 'react'
import { useUploadManager } from '@renderer/hooks/useUploadManager'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import loadingVideo from '@renderer/videos/uploadingvideo.mp4'
import { JSX } from 'react'
import { InsertDiskPage, ReviewPage } from '@renderer/entites/Wizard'
import { ErrorUpload } from './UploadPageComponentes/ErrorUpload'
import { ReadyUpload } from './UploadPageComponentes/ReadyUpload'
import { UploadingUpload } from './UploadPageComponentes/UploadingUpload'

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

  const shown = totalDiscovered || preCalcTotal || currentDisk.selectedFiles.length
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
    <div className="wizard-layout">
      <div className="glass-card">
        {/* === SCENARIO 1: ERROR === */}
        {uploadError && (
          <ErrorUpload uploadError={uploadError} setStep={setStep} ReviewPage={ReviewPage} />
        )
        }

        {/* === SCENARIO 2: READY === */}
        {
          !uploadError && phase === 'ready' && (
            <ReadyUpload
              countingComplete={countingComplete}
              startUpload={startUpload}
              preCalcTotal={preCalcTotal} />
          )
        }

        {/* === SCENARIO 3: UPLOADING / DONE === */}
        {
          !uploadError && phase !== 'ready' && (
            <UploadingUpload
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
              loadingVideo={loadingVideo}
              completedBytes={completedBytes}
              totalBytes={totalBytes}
            />)
        }
      </div >
    </div >
  )
}
