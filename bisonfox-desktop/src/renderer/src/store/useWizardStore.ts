import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { clientLogger } from '@renderer/utils/logger'
import { WizardData, WizardActions, WelcomePage } from '@renderer/entites/Wizard'

const INITIAL_DATA: WizardData = {
  step: WelcomePage,
  userName: '',
  sessionId: '',
  diskSessions: [],
  currentDisk: null,
  currentSubfolder: '',
  uploadProgress: {},
  uploadDone: false,
  completedFiles: 0,
  toast: { message: null, type: 'info' },
  isCancelModalOpen: false,
  isKeyboardVisible: false
}

export const useWizardStore = create<WizardData & WizardActions>()(
  immer((set) => ({
    ...INITIAL_DATA,

    setStep: (step: React.LazyExoticComponent<() => React.JSX.Element | null>) => set({ step }),

    setUserName: (userName) => {
      clientLogger.debug('Store', `Username set to: ${userName}`)
      set({ userName })
    },

    setSessionId: (sessionId) => set({ sessionId }),

    setCurrentSubfolder: (currentSubfolder) => set({ currentSubfolder }),

    addDiskSession: (session) => {
      clientLogger.info('Store', `Added disk queue: ${session.driveLabel}`, {
        fileCount: session.selectedFiles.length
      })
      set((state) => {
        state.diskSessions.push(session)
      })
    },

    updateLastDiskSession: (updates) =>
      set((state) => {
        const last = state.diskSessions[state.diskSessions.length - 1]
        if (last) Object.assign(last, updates)
      }),

    setCurrentDisk: (currentDisk) => set({ currentDisk }),

    removeFile: (diskIndex, filePath) =>
      set((state) => {
        const session = state.diskSessions[diskIndex]
        if (session) {
          session.selectedFiles = session.selectedFiles.filter((f) => f !== filePath)
        }
      }),

    setUploadProgress: (uploadProgress) => set({ uploadProgress }),

    setUploadDone: (uploadDone) => set({ uploadDone }),

    setCompletedFiles: (completedFiles) => set({ completedFiles }),

    setToast: (message, type = 'info') => set({ toast: { message, type } }),

    reset: () => {
      clientLogger.info('Store', 'Wizard reset triggered.')
      set(INITIAL_DATA)
    },
    setCancelModalOpen: (isCancelModalOpen) => set({ isCancelModalOpen }),
    setKeyboardVisible: (isKeyboardVisible) => set({ isKeyboardVisible })
  }))
)
