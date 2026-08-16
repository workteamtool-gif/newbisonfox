import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { SessionSingleton } from '@main/application/UploadSession'
import { NameValidator } from '@main/domain/validators/NameValidator'
import { SubfolderValidator } from '@main/domain/validators/SubfolderValidator'
import { SpecialCodeValidator } from '@main/domain/validators/SpecialCodeValidator'

const nameValidator = new NameValidator()
const subfolderValidator = new SubfolderValidator()
const specialCodeValidator = new SpecialCodeValidator()
const sessionSingletonInstance = SessionSingleton.getInstance()

// SESSION handlers manage user identity, input validation, and session lifecycle.
export function registerSessionHandlers(): void {
  // Validates that the proposed username conforms to the allowed character rules.
  ipcMain.handle(IPC_CHANNELS.SESSION.VALIDATE_NAME, (_, { name }) => {
    return nameValidator.validate(name)
  })

  // Validates that the proposed subfolder name conforms to the allowed character rules.
  ipcMain.handle(IPC_CHANNELS.SESSION.VALIDATE_SUBFOLDER, (_, { name }) => {
    return subfolderValidator.validate(name)
  })

  // Validates a special access code and marks the session as restricted if valid.
  ipcMain.handle(IPC_CHANNELS.SESSION.VALIDATE_SPECIAL_CODE, async (_, { sessionId, code }) => {
    return specialCodeValidator.validate(code, sessionId)
  })

  // Creates a new upload session for the given username and returns its ID.
  ipcMain.handle(IPC_CHANNELS.SESSION.CREATE, async (_, { username }) => {
    const session = sessionSingletonInstance.create(username)
    return { sessionId: session.id }
  })

  // Deletes an active session (e.g. when user goes back to welcome page)
  ipcMain.handle(IPC_CHANNELS.SESSION.DELETE, async (_, { sessionId }) => {
    sessionSingletonInstance.delete(sessionId)
    return { success: true }
  })
}
