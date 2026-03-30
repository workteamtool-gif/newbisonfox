import { DriveInfo } from '@shared/entities/DriveInfo'

export interface IDiskService {
  listDrives(): Promise<DriveInfo[]>
}
