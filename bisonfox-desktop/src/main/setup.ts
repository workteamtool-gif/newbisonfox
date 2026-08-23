import { FileService } from '@main/infrastructure/services/FileService'
import { DiskService } from '@main/infrastructure/services/DiskService'
import { HardwareService } from '@main/infrastructure/services/HardwareService'
import { SystemService } from '@main/infrastructure/services/SystemService'
import { ElectronEventNotifier } from '@main/infrastructure/services/ElectronEventNotifier'
import { UploadManager } from '@main/application/UploadManager'
import { UploadValidator } from '@main/domain/validators/UploadValidator'
import { registerIpcHandlers } from '@main/ipc/ipcHandlers'

export function setupApplication(): { uploadManager: UploadManager } {
  const fileService = new FileService()
  const diskService = new DiskService()
  const hardwareService = new HardwareService()
  const systemService = new SystemService(hardwareService)
  const eventNotifier = new ElectronEventNotifier()
  const uploadValidator = new UploadValidator()

  const uploadManager = new UploadManager(fileService, eventNotifier, uploadValidator)

  registerIpcHandlers({
    diskService,
    fileService,
    systemService,
    uploadManager
  })

  return { uploadManager }
}
