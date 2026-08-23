import { useEffect } from 'react'
import { useUploadManager } from '@renderer/pages/UploadPage/hooks/useUploadManager'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import loadingVideo from '@renderer/videos/uploadingvideo.mp4'
import { JSX } from 'react'
import { SetupPage, ReviewSelectedItemsPage } from '@renderer/entites/Wizard'
import { ErrorUpload } from '@renderer/pages/UploadPage/components/ErrorUpload'
import { CountingUpload } from '@renderer/pages/UploadPage/components/CountingUpload'
import { UploadComponent } from '@renderer/pages/UploadPage/components/UploadComponent'

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
    if (!currentDisk) setStep(SetupPage)
  }, [currentDisk, setStep])

  if (!currentDisk) return null

  const shown = totalDiscovered || preCalcTotal || currentDisk.selectedItemPaths.length
  const doneTotal = completedCount + failedCount

  const phaseLabel =
    phase === 'preparing' ? (
      <>מכין...</>
    ) : phase === 'scanning' ? (
      <>סורק... נמצאו {totalDiscovered.toLocaleString()} קבצים</>
    ) : (
      <>
        מעתיק {totalDiscovered.toLocaleString()} / {doneTotal.toLocaleString()} קבצים
      </>
    )

  const showFailedReview = uploadDone && failedFilesList.length > 0

  const MAX_FAILED_FILES_TO_SHOW = 20

  return (
    <div className="glass-card">
      {/* === SCENARIO 1: ERROR === */}
      {uploadError && (
        <ErrorUpload uploadError={uploadError} setStep={setStep} ReviewSelectedItemsPage={ReviewSelectedItemsPage} />
      )}

      {/* === SCENARIO 2: COUNTING === */}
      {!uploadError && phase === 'ready' && (
        <CountingUpload
          countingComplete={countingComplete}
          startUpload={startUpload}
          preCalcTotal={preCalcTotal}
        />
      )}

      {/* === SCENARIO 3: UPLOADING / DONE === */}
      {!uploadError && phase !== 'ready' && (
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
        />
      )}
    </div>
  )
}
