import { useEffect } from 'react'
import { JSX } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'

import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { ConfirmModal } from '@renderer/components/ConfirmModal/ConfirmModal'
import { useKeyboardDetection } from '@renderer/hooks/useKeyboardDetection'

import { useDrives } from './hooks/useDrives'
import { useSetupForm } from './hooks/useSetupForm'
import { DriveList } from './components/DriveList'
import { UserNameInput, SubfolderInput } from './components/SetupInputs'

import { EasterEgg } from '@renderer/components/EasterEgg/EasterEgg'
import { useEasterEggTrigger } from '@renderer/components/EasterEgg/useEasterEggTrigger'
import { EasterEgg2 } from '@renderer/components/EasterEgg2/EasterEgg2'
import { useUsernameEasterEggTrigger } from '@renderer/components/EasterEgg2/useUsernameEasterEggTrigger'

import './SetupPage.css'

export function SetupPage(): JSX.Element {
  const { isCancelModalOpen, setKeyboardVisible } = useWizardStore()

  const { drives, loadingDrives, selectedLetter, setSelectedLetter } = useDrives()

  const {
    name,
    setName,
    nameError,
    subfolder,
    setSubfolder,
    subfolderError,
    loading,
    isConfirmOpen,
    setIsConfirmOpen,
    activeInput,
    setActiveInput,
    maxNameLength,
    maxSubfolderLength,
    validateName,
    validateSubfolder,
    handleSubmit,
    handleConfirm,
    handleVirtualKeyboardChange,
    handleBack,
    isFormValid,
    diskSessionsLength
  } = useSetupForm(drives, selectedLetter)

  const openKeyboard = useKeyboardDetection()
  const showKeyboard = openKeyboard && !isCancelModalOpen && !isConfirmOpen

  const showEasterEgg = useEasterEggTrigger(isCancelModalOpen, {
    triggerCount: 7,
    durationMs: 5000
  })

  const showEasterEgg2 = useUsernameEasterEggTrigger(name, 't_t_t_lightning_fox', 5000)

  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  return (
    <>
      <div className="glass-card">
        <p className="page-title setup-page-title">הגדרת העברה</p>

        <form onSubmit={handleSubmit} className="setup-form-container">
          {/* 2-Column Grid/Flex layout */}
          <div className="setup-grid">
            {/* RIGHT SIDE (in RTL): User Name */}
            <div className="setup-col-right">
              <UserNameInput
                name={name}
                setName={setName}
                nameError={nameError}
                maxNameLength={maxNameLength}
                validateName={validateName}
                setActiveInput={setActiveInput}
              />
            </div>

            {/* DIVIDER */}
            <div className="setup-divider" />

            {/* LEFT SIDE: Drive & Subfolder */}
            <div className="setup-col-left">
              <DriveList
                drives={drives}
                loadingDrives={loadingDrives}
                selectedLetter={selectedLetter}
                onSelectLetter={setSelectedLetter}
              />

              <SubfolderInput
                subfolder={subfolder}
                setSubfolder={setSubfolder}
                subfolderError={subfolderError}
                maxSubfolderLength={maxSubfolderLength}
                validateSubfolder={validateSubfolder}
                setActiveInput={setActiveInput}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="setup-footer">
            <NavigationOptions
              onBack={handleBack}
              backLabel={diskSessionsLength > 0 ? 'סיום העברה' : '→ חזור'}
              onForward={handleSubmit}
              forwardDisabled={!isFormValid || loading}
              forwardLabel={
                loading ? (
                  <>
                    <span className="spin">⟳</span> בודק...
                  </>
                ) : (
                  <>המשך ←</>
                )
              }
            />
          </div>
        </form>
      </div>

      {showKeyboard && (
        <VirtualKeyboard
          currentValue={activeInput === 'name' ? name : subfolder}
          onChange={handleVirtualKeyboardChange}
        />
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="אישור נתונים"
        message={`האם אתה בטוח ששם המשתמש "${name.trim()}" הוא נכון?`}
        confirmText="כן, זה נכון"
        cancelText="לא, חזור לחלון הקודם"
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
      />

      <EasterEgg isVisible={showEasterEgg} />
      <EasterEgg2 isVisible={showEasterEgg2} />
    </>
  )
}
