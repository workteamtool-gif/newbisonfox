import { FileService } from './infrastructure/services/FileService'
import { DiskService } from './infrastructure/services/DiskService'
import { ElectronEventNotifier } from './infrastructure/services/ElectronEventNotifier'
import { UploadManager } from './application/UploadManager'
import { registerIpcHandlers } from './ipcHandlers'
import { logger } from '@main/infrastructure/loggers/Logger'

export function setupApplication(): { uploadManager: UploadManager } {
  logger.info('System', 'Bootstrapping application services...')

  // 1. Create Infrastructure (The physical tools)
  const fileService = new FileService()
  const diskService = new DiskService()
  const eventNotifier = new ElectronEventNotifier()

  // 2. Create Application Engine (Injecting the tools it needs)
  const uploadManager = new UploadManager(fileService, eventNotifier)

  // 3. Connect the Electron router to the Engine
  registerIpcHandlers({
    diskService,
    fileService,
    uploadManager
  })

  logger.info('System', 'Application services and IPC handlers successfully registered.')

  return { uploadManager }
}
