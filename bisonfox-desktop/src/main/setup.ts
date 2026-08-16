import { FileService } from './infrastructure/services/FileService'
import { DiskService } from './infrastructure/services/DiskService'
import { HardwareService } from './infrastructure/services/HardwareService'
import { ElectronEventNotifier } from './infrastructure/services/ElectronEventNotifier'
import { UploadManager } from './application/UploadManager'
import { registerIpcHandlers } from './ipcHandlers'

export function setupApplication(): { uploadManager: UploadManager } {
  const fileService = new FileService()
  const diskService = new DiskService()
  const hardwareService = new HardwareService()
  const eventNotifier = new ElectronEventNotifier()

  const uploadManager = new UploadManager(fileService, eventNotifier)

  registerIpcHandlers({
    diskService,
    fileService,
    hardwareService,
    uploadManager
  })

  return { uploadManager }
}
