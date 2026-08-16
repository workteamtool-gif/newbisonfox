import { FileService } from './infrastructure/services/FileService'
import { DiskService } from './infrastructure/services/DiskService'
import { HardwareService } from './infrastructure/services/HardwareService'
import { ElectronEventNotifier } from './infrastructure/services/ElectronEventNotifier'
import { UploadManager } from './application/UploadManager'
import { UploadValidator } from './domain/validators/UploadValidator'
import { registerIpcHandlers } from './ipc/ipcHandlers'

export function setupApplication(): { uploadManager: UploadManager } {
  const fileService = new FileService()
  const diskService = new DiskService()
  const hardwareService = new HardwareService()
  const eventNotifier = new ElectronEventNotifier()
  const uploadValidator = new UploadValidator()

  const uploadManager = new UploadManager(fileService, eventNotifier, uploadValidator)

  registerIpcHandlers({
    diskService,
    fileService,
    hardwareService,
    uploadManager
  })

  return { uploadManager }
}
