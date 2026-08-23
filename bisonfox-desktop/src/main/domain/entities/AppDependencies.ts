import { DiskService } from '@main/domain/interfaces/DiskService'
import { FileService } from '@main/domain/interfaces/FileService'
import { SystemService } from '@main/infrastructure/services/SystemService'
import { UploadManager } from '@main/application/UploadManager'

export interface AppDependencies {
  diskService: DiskService
  fileService: FileService
  systemService: SystemService
  uploadManager: UploadManager
}