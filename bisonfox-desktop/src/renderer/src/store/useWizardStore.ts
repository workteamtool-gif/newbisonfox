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
      clientLogger.info('WizardStore', `Username set to: ${userName}`)
      set({ userName })
    },

    setSessionId: (sessionId) => set({ sessionId }),

    setCurrentSubfolder: (currentSubfolder) => set({ currentSubfolder }),

    addDiskSession: (session) => {
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
    
    setUploadDone: (uploadDone) => set({ uploadDone }),

    setCompletedFiles: (completedFiles) => set({ completedFiles }),

    setToast: (message, type = 'info') => set({ toast: { message, type } }),

    reset: () => {
      clientLogger.info('WizardStore', 'Wizard reset triggered.')
      set(INITIAL_DATA)
    },
    setCancelModalOpen: (isCancelModalOpen) => set({ isCancelModalOpen }),
    setKeyboardVisible: (isKeyboardVisible) => set({ isKeyboardVisible })
  }))
)
