import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { UploadManager } from '@main/application/UploadManager'

// UPLOAD handlers manage the full lifecycle of an upload: scanning, selection, execution, and logging.
export function registerUploadHandlers(uploadManager: UploadManager): void {
  // Starts a background scan to count files and bytes for the pre-upload summary.
  ipcMain.handle(IPC_CHANNELS.UPLOAD.START_COUNT, async (_, { scanId, selectedPaths, excludedPaths }) => {
    await uploadManager.startCount(scanId, selectedPaths, excludedPaths)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.CANCEL_COUNT, (_, { scanId }) => {
    uploadManager.cancelCount(scanId)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.ADD_DISK_FILES, (_, { sessionId, driveLetter, selectedItemPaths, excludedItemPaths }) => {
    uploadManager.addDiskFiles(sessionId, driveLetter, selectedItemPaths, excludedItemPaths)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD.REMOVE_FILE, (_, { sessionId, filePath, diskIndex }) => {
    uploadManager.removeFile(sessionId, filePath, diskIndex)
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
  ipcMain.handle(IPC_CHANNELS.UPLOAD.LOG_MAIL, (_, { username, subfolder, succeededFilesAmount, totalFilesAmount, failedFilesAmount, interfaceName }) => {
    uploadManager.logMail(username, subfolder, succeededFilesAmount, totalFilesAmount, failedFilesAmount, interfaceName)
    return { success: true }
  })
}
