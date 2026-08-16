import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { SessionSingleton } from '../application/UploadSession'
import { FileService } from '../domain/interfaces/FileService'
import { UploadManager } from '../application/UploadManager'
import { logMail } from '../infrastructure/loggers/MailLogger'

const sessionSingletonInstance = SessionSingleton.getInstance()
const countFileControllers = new Map<string, AbortController>()

function pushToFrontend(channel: string, payload: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send(channel, payload)
  }
}

// UPLOAD handlers manage the full lifecycle of an upload: scanning, selection, execution, and logging.
export function registerUploadHandlers(fileService: FileService, uploadManager: UploadManager): void {
  // Starts a background scan to count files and bytes for the pre-upload summary.
  // Progress updates are streamed live to the frontend via pushToFrontend.
  ipcMain.handle(IPC_CHANNELS.UPLOAD.START_COUNT, async (_, { scanId, selectedPaths, excludedPaths }) => {
    const onCount = (count: number, size: number): void =>
      pushToFrontend(`${IPC_CHANNELS.UPLOAD.COUNT_PREFIX}${scanId}`, { count, size })

    const controller = new AbortController()
    countFileControllers.set(scanId, controller)

    try {
      const { count, size } = await fileService.countFiles(selectedPaths, excludedPaths, onCount, controller.signal)
      pushToFrontend(`${IPC_CHANNELS.UPLOAD.COUNT_PREFIX}${scanId}`, { done: true, count, size })
    } catch (err: unknown) {
      pushToFrontend(`${IPC_CHANNELS.UPLOAD.COUNT_PREFIX}${scanId}`, {
        error: err instanceof Error ? err.message : String(err)
      })
    } finally {
      countFileControllers.delete(scanId)
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.CANCEL_COUNT, (_, { scanId }) => {
    const controller = countFileControllers.get(scanId)
    if (controller) {
      controller.abort()
      countFileControllers.delete(scanId)
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.ADD_DISK_FILES, (_, { sessionId, driveLetter, selectedItemPaths, excludedItemPaths }) => {
    const session = sessionSingletonInstance.get(sessionId)
    if (!session) throw new Error('Session not found')

    session.diskSessions.push({
      driveLetter,
      selectedItemPaths,
      excludedItemPaths: excludedItemPaths ?? []
    })
    sessionSingletonInstance.update(sessionId, { diskSessions: session.diskSessions })
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.REMOVE_FILE, (_, { sessionId, filePath, diskIndex }) => {
    const session = sessionSingletonInstance.get(sessionId)
    if (!session) throw new Error('Session not found')

    const diskSession = session.diskSessions[diskIndex]
    if (diskSession) {
      diskSession.selectedItemPaths = diskSession.selectedItemPaths.filter((p) => p !== filePath)
      sessionSingletonInstance.update(sessionId, { diskSessions: session.diskSessions })
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.START, async (_, { sessionId, files, subfolder, expectedTotal, expectedTotalBytes }) => {
    uploadManager.startUpload(sessionId, { files, subfolder, expectedTotal, expectedTotalBytes })
    return { success: true, message: 'Upload started' }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.CANCEL, (_, { sessionId }) => {
    uploadManager.cancelUpload(sessionId)
    return { success: true }
  })

  // Writes the final upload summary (mail log)
  ipcMain.handle(IPC_CHANNELS.UPLOAD.LOG_MAIL, (_, { username, subfolder, succeededFilesAmount, totalFilesAmount, failedFilesAmount }) => {
    logMail(username, subfolder, succeededFilesAmount, totalFilesAmount, failedFilesAmount)
    return { success: true }
  })
}
