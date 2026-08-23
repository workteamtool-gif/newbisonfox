import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { ValidationResult } from '@shared/entities/ValidationResult'

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

  validateSpecialCode: async (sessionId: string, code: string): Promise<ValidationResult> => {
    return (await window.api.invoke(IPC_CHANNELS.SESSION.VALIDATE_SPECIAL_CODE, {
      sessionId,
      code
    })) as ValidationResult
  },

  createSession: async (username: string): Promise<CreateSessionResult> => {
    return (await window.api.invoke(IPC_CHANNELS.SESSION.CREATE, {
      username
    })) as CreateSessionResult
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await window.api.invoke(IPC_CHANNELS.SESSION.DELETE, {
      sessionId
    })
  }
}
