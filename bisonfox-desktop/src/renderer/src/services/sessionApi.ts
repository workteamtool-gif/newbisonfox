import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

interface ValidationResult {
  valid: boolean
  message?: string
}

interface CreateSessionResult {
  sessionId: string
}

export const sessionApi = {
  validateName: async (name: string): Promise<ValidationResult> => {
    return (await window.api.invoke(IPC_CHANNELS.SESSION.VALIDATE_NAME, {
      name
    })) as ValidationResult
  },

  validateSubfolder: async (name: string): Promise<ValidationResult> => {
    return (await window.api.invoke(IPC_CHANNELS.SESSION.VALIDATE_SUBFOLDER, {
      name
    })) as ValidationResult
  },

  createSession: async (username: string): Promise<CreateSessionResult> => {
    return (await window.api.invoke(IPC_CHANNELS.SESSION.CREATE, {
      username
    })) as CreateSessionResult
  }
}
