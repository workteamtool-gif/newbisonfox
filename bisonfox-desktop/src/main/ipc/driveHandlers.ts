import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { DiskService } from '@main/domain/interfaces/DiskService'
import { FileService } from '@main/domain/interfaces/FileService'

// DRIVE handlers expose the file system for browsing and searching drives.
export function registerDriveHandlers(diskService: DiskService, fileService: FileService): void {
  // Returns a list of all connected physical and logical drives on this machine.
  ipcMain.handle(IPC_CHANNELS.DRIVE.LIST, async () => {
    return diskService.listDrives()
  })

  // Returns the paginated contents of a specific directory path.
  ipcMain.handle(IPC_CHANNELS.DRIVE.GET_DIR, async (_, { dirPath, page, limit }) => {
    return fileService.paginatedListDir(dirPath, page, limit)
  })

  // Returns the total number of items in a directory (used for pagination calculation).
  ipcMain.handle(IPC_CHANNELS.DRIVE.GET_DIR_COUNT, async (_, { dirPath }) => {
    return fileService.getDirCount(dirPath)
  })

  // Performs a shallow search within a directory for items matching the query string.
  ipcMain.handle(IPC_CHANNELS.DRIVE.FIND_PAGE, async (_, { dirPath, query }) => {
    return fileService.findPageOfItem(dirPath, query)
  })

  // Performs a recursive deep search across all subdirectories for items matching the query.
  ipcMain.handle(IPC_CHANNELS.DRIVE.DEEP_FIND, async (_, { dirPath, query }) => {
    return fileService.deepFindItem(dirPath, query)
  })
}
