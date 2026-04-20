import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

export const sessionApi = {
  validateName: async (name: string) => {
    return await window.api.invoke(IPC_CHANNELS.SESSION.VALIDATE_NAME, { name })
  },

  validateSubfolder: async (name: string) => {
    return await window.api.invoke(IPC_CHANNELS.SESSION.VALIDATE_SUBFOLDER, { name })
  },

  createSession: async (userName: string) => {
    return await window.api.invoke(IPC_CHANNELS.SESSION.CREATE, { userName })
  }
}
