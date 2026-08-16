import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { sessionSingleton } from '@main/application/UploadSession'
import { NameValidator } from '@main/domain/validators/NameValidator'
import { SubfolderValidator } from '@main/domain/validators/SubfolderValidator'
import { validateSpecialCode } from '@main/domain/interfaces/Validators/SpecialCodeValidator'

const nameValidator = new NameValidator()
const subfolderValidator = new SubfolderValidator()
const sessionSingletonInstance = sessionSingleton.getInstance()

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
    return validateSpecialCode(sessionId, code)
  })

  // Creates a new upload session for the given username and returns its ID.
  ipcMain.handle(IPC_CHANNELS.SESSION.CREATE, (_, { username }) => {
    const session = sessionSingletonInstance.create(username)
    return { success: true, sessionId: session.id }
  })
}
