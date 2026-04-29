import { useWizardStore } from '@renderer/store/useWizardStore'
import unplugImage from '@renderer/images/unplugging.png'
import './PullDiskPage.css'
import { JSX } from 'react'
import { AnotherDiskPage, InsertDiskPage } from '@renderer/entites/Wizard'

export function PullDiskPage(): JSX.Element | null {
  const { setStep, setCurrentDisk, setCurrentSubfolder, currentDisk, completedFiles } =
    useWizardStore()

  function handleContinue(): void {
    setCurrentDisk(null)
    setCurrentSubfolder('')
    setStep(AnotherDiskPage)
  }

  if (!currentDisk) {
    setStep(InsertDiskPage)
    return null
  }

  return (
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <p className="page-title">הוצאת הכונן</p>
        <p className="page-subtitle">
          כל <strong>{completedFiles.toLocaleString()}</strong> הקבצים נרשמו. אנא הסר את הכונן בבטחה כעת.
        </p>

        <div className="pull-disk-visual">
          <img src={unplugImage} alt="Unplug Drive" className="pull-disk-image" />
          <span className="pull-disk-label">ניתן כעת לנתק בבטחה</span>
        </div>

        <div className="action-row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={handleContinue}>
            ניתקתי את הכונן
          </button>
        </div>
      </div>
  )
}
