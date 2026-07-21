import { DriveInfo } from '@shared/entities/DriveInfo'

export interface DiskService {
  listDrives(): Promise<DriveInfo[]>
}
