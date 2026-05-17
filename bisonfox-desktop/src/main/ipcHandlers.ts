import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { IDiskService } from './domain/interfaces/IDiskService'
import { IFileService } from './domain/interfaces/IFileService'
import { UploadManager } from './application/UploadManager'
import { sessionSingleton } from './application/UploadSession'
import { scanManager } from './application/ScanManager'
import { NameValidator } from './domain/validators/NameValidator'
import { SubfolderValidator } from './domain/validators/SubfolderValidator'

export interface AppDependencies {
  diskService: IDiskService
  fileService: IFileService
  uploadManager: UploadManager
}

const nameValidator = new NameValidator()
const subfolderValidator = new SubfolderValidator()
const sessionSingletonInstance = sessionSingleton.getInstance()
const countFileControllers = new Map<string, AbortController>()

export function registerIpcHandlers(dependencies: AppDependencies): void {
  const { diskService, fileService, uploadManager } = dependencies

  const pushToFrontend = (channel: string, payload: any): void => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(channel, payload)
    }
  }

  ipcMain.handle(IPC_CHANNELS.SESSION.VALIDATE_NAME, (_, { name }) => {
    return nameValidator.validate(name)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION.VALIDATE_SUBFOLDER, (_, { name }) => {
    return subfolderValidator.validate(name)
  })

  ipcMain.handle(IPC_CHANNELS.DRIVE.LIST, async () => {
    return await diskService.listDrives()
  })

  ipcMain.handle('get-drive-tree', async (_, { drive, page, limit }) => {
    return await fileService.listDir(drive, page, limit)
  })

  ipcMain.handle('get-dir', async (_, { dirPath, page, limit }) => {
    return await fileService.listDir(dirPath, page, limit)
  })

  ipcMain.handle('get-dir-count', async (_, { dirPath }) => {
    return await fileService.getDirCount(dirPath)
  })

  ipcMain.handle('find-item-page', async (_, { dirPath, query }) => {
    return await fileService.findItemPage(dirPath, query)
  })

  ipcMain.handle('deep-find-item', async (_, { dirPath, query }) => {
    return await fileService.deepFindItem(dirPath, query)
  })

  ipcMain.handle('start-count-files', async (_, { scanId, selectedPaths, excludedPaths }) => {
    const onCount = (count: number, size: number): void => pushToFrontend(`count-files-${scanId}`, { count, size })

    const controller = new AbortController()
    countFileControllers.set(scanId, controller)

    try {
      const { count, size } = await fileService.countFiles(
        selectedPaths,
        excludedPaths,
        onCount,
        controller.signal
      )
      pushToFrontend(`count-files-${scanId}`, { done: true, count, size })
    } catch (err: any) {
      pushToFrontend(`count-files-${scanId}`, { error: err.message })
    } finally {
      countFileControllers.delete(scanId)
    }
  })

  ipcMain.handle('cancel-count-files', (_, { scanId }) => {
    const controller = countFileControllers.get(scanId)
    if (controller) {
      controller.abort()
      countFileControllers.delete(scanId)
    }

    const session = scanManager.consumeSession(scanId)
    if (session) clearTimeout(session.timeout)

    return { success: true }
  })
  ipcMain.handle('create-session', (_, { userName }) => {
    const session = sessionSingletonInstance.create(userName)
    return { success: true, sessionId: session.id }
  })

  ipcMain.handle('add-disk-files', (_, { sessionId, driveLetter, selectedFiles, excludedFiles }) => {
    const session = sessionSingletonInstance.get(sessionId)
    if (!session) throw new Error('Session not found')

    session.diskSessions.push({ driveLetter, selectedFiles, excludedFiles: excludedFiles ?? [] })
    sessionSingletonInstance.update(sessionId, { diskSessions: session.diskSessions })
    return { success: true }
  })

  ipcMain.handle('remove-file', (_, { sessionId, filePath, diskIndex }) => {
    const session = sessionSingletonInstance.get(sessionId)
    if (!session) throw new Error('Session not found')

    const disk = session.diskSessions[diskIndex]
    if (disk) {
      disk.selectedFiles = disk.selectedFiles.filter((files) => files !== filePath)
      sessionSingletonInstance.update(sessionId, { diskSessions: session.diskSessions })
    }
    return { success: true }
  })

  ipcMain.handle('start-upload', async (_, { sessionId, files, subfolder, expectedTotalFiles, expectedTotalBytes }) => {
    uploadManager.startUpload(sessionId, { files, subfolder, expectedTotalFiles, expectedTotalBytes })
    return { success: true, message: 'Upload started' }
  })

  ipcMain.handle('cancel-upload', (_, { sessionId }) => {
    uploadManager.cancelUpload(sessionId)
    return { success: true }
  })
}
