const { app } = require('electron')
import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import fs from 'original-fs'
import path from 'path'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { DiskService } from './domain/interfaces/DiskService'
import { FileService } from './domain/interfaces/FileService'
import { UploadManager } from './application/UploadManager'
import { sessionSingleton } from './application/UploadSession'
import { NameValidator } from './domain/validators/NameValidator'
import { SubfolderValidator } from './domain/validators/SubfolderValidator'
import { logMail } from './infrastructure/loggers/MailLogger'
import { config } from './appConfig'

export interface AppDependencies {
  diskService: DiskService
  fileService: FileService
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

  ipcMain.handle(IPC_CHANNELS.SESSION.VALIDATE_SPECIAL_CODE, async (_, { sessionId, code }) => {
    if (!code || code.trim() === '') {
      return { valid: true }
    }

    const trimmedCode = code.trim()
    
    const checkDirForCode = async (dirPath: string): Promise<string | null> => {
      try {
        if (!fs.existsSync(dirPath)) return null;
        const files = await fs.promises.readdir(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile()) {
            const content = (await fs.promises.readFile(filePath, 'utf-8')).trim();
            if (content === trimmedCode) {
              return filePath;
            }
          }
        }
      } catch (err) {
        console.error(`Error checking codes in ${dirPath}:`, err);
      }
      return null;
    }

    // Check reusable codes
    const reusableDir = config.reusableCodesDir
    if (reusableDir) {
      const matchedPath = await checkDirForCode(reusableDir)
      if (matchedPath) {
        sessionSingletonInstance.update(sessionId, { isRestricted: true })
        return { valid: true }
      }
    }

    // Check disposable codes
    const disposableDir = config.disposableCodesDir
    if (disposableDir) {
      const matchedPath = await checkDirForCode(disposableDir)
      if (matchedPath) {
        const usedDir = config.usedCodesDir
        if (usedDir) {
          try {
            if (!fs.existsSync(usedDir)) {
              await fs.promises.mkdir(usedDir, { recursive: true }).catch(() => {})
            }
            const usedPath = path.join(usedDir, path.basename(matchedPath))
            await fs.promises.rename(matchedPath, usedPath)
          } catch (moveErr) {
            console.error('Error moving disposable code file:', moveErr)
          }
        }

        sessionSingletonInstance.update(sessionId, { isRestricted: true })
        return { valid: true }
      }
    }

    return { valid: false, message: 'קוד שגוי או שכבר נעשה בו שימוש' }
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
    const onCount = (count: number, size: number): void =>
      pushToFrontend(`count-files-${scanId}`, { count, size })

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
    } catch (err: unknown) {
      pushToFrontend(`count-files-${scanId}`, {
        error: err instanceof Error ? err.message : String(err)
      })
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

    return { success: true }
  })
  ipcMain.handle('create-session', (_, { username }) => {
    const session = sessionSingletonInstance.create(username)
    return { success: true, sessionId: session.id }
  })

  ipcMain.handle(
    'add-disk-files',
    (_, { sessionId, driveLetter, selectedItemPaths, excludedItemPaths }) => {
      const session = sessionSingletonInstance.get(sessionId)
      if (!session) throw new Error('Session not found')

      session.diskSessions.push({
        driveLetter,
        selectedItemPaths,
        excludedItemPaths: excludedItemPaths ?? []
      })
      sessionSingletonInstance.update(sessionId, { diskSessions: session.diskSessions })
      return { success: true }
    }
  )

  ipcMain.handle('remove-file', (_, { sessionId, filePath, diskIndex }) => {
    const session = sessionSingletonInstance.get(sessionId)
    if (!session) throw new Error('Session not found')

    const diskSession = session.diskSessions[diskIndex]
    if (diskSession) {
      diskSession.selectedItemPaths = diskSession.selectedItemPaths.filter(
        (itemPath) => itemPath !== filePath
      )
      sessionSingletonInstance.update(sessionId, { diskSessions: session.diskSessions })
    }
    return { success: true }
  })

  ipcMain.handle(
    'start-upload',
    async (_, { sessionId, files, subfolder, expectedTotal, expectedTotalBytes }) => {
      uploadManager.startUpload(sessionId, {
        files,
        subfolder,
        expectedTotal,
        expectedTotalBytes
      })
      return { success: true, message: 'Upload started' }
    }
  )

  ipcMain.handle('cancel-upload', (_, { sessionId }) => {
    uploadManager.cancelUpload(sessionId)
    return { success: true }
  })

  ipcMain.handle(
    'log-mail',
    (_, { username, subfolder, succeededFilesAmount, totalFilesAmount, failedFilesAmount }) => {
      logMail(username, subfolder, succeededFilesAmount, totalFilesAmount, failedFilesAmount)
      return { success: true }
    }
  )

  ipcMain.handle('system:close', () => {
    app.quit()

    return { success: true }
  })

  ipcMain.handle('open-cmd', () => {
    try {
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { detached: true, stdio: 'ignore' })
      return { success: true }
    } catch (err: unknown) {
      console.error('Failed to open CMD:', err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
