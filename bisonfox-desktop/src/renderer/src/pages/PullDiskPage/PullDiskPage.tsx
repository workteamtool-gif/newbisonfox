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
    <div className="wizard-layout">
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <p className="page-title">Pull the Disk</p>
        <p className="page-subtitle">
          All <strong>{completedFiles.toLocaleString()}</strong> files from{' '}
          <strong>{currentDisk.driveLabel}</strong> have been noted. Please safely remove the drive
          now.
        </p>

        <div className="pull-disk-visual">
          <img src={unplugImage} alt="Unplug Drive" className="pull-disk-image" />
          <span className="pull-disk-label">You may now safely unplug</span>
        </div>

        <div className="info-box" style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <span className="info-icon">⚠️</span>
          <span>
            Make sure to eject the drive from your OS before physically removing it to avoid data
            corruption.
          </span>
        </div>

        <div className="action-row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={handleContinue}>
            I&apos;ve Unplugged It →
          </button>
        </div>
      </div>
    </div>
  )
}
