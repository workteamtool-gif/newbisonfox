
import { DiskService } from '@main/domain/interfaces/DiskService'
import { FileService } from '@main/domain/interfaces/FileService'
import { HardwareService } from '@main/infrastructure/services/HardwareService'
import { UploadManager } from '@main/application/UploadManager'

export interface AppDependencies {
  diskService: DiskService
  fileService: FileService
  hardwareService: HardwareService
  uploadManager: UploadManager
}