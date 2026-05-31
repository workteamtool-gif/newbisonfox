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

  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  return (
    <>
      <div className="glass-card">
        <p className="page-title" style={{ marginBottom: '2rem' }}>
          הגדרת העברה
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          {/* 2-Column Grid/Flex layout */}
          <div style={{ display: 'flex', gap: '3rem', flex: 1, alignItems: 'flex-start' }}>
            {/* RIGHT SIDE (in RTL): User Name */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'center'
              }}
            >
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
            <div
              style={{
                width: '1px',
                background: 'rgba(255, 255, 255, 0.15)',
                height: '80%',
                alignSelf: 'center'
              }}
            />

            {/* LEFT SIDE: Drive & Subfolder */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                height: '100%',
                justifyContent: 'center'
              }}
            >
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
          <div style={{ marginTop: 'auto' }}>
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
    </>
  )
}

