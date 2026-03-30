import { clientLogger } from '@renderer/utils/logger'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { FileNode } from '@shared/entities/FileNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'

const ITEMS_IN_ONE_PAGE = Number(import.meta.env.VITE_ITEMS_IN_ONE_PAGE) || 48

export const driveApi = {
  listDrives: async (): Promise<DriveInfo[]> => {
    clientLogger.debug('API', 'Requesting drive list via IPC')
    const result = await window.api.invoke(IPC_CHANNELS.DRIVE.LIST)
    return result ?? []
  },

  getDriveTree: async (
    drive: string,
    page: number = 1,
    limit: number = ITEMS_IN_ONE_PAGE
  ): Promise<PaginatedResult<FileNode[]>> => {
    clientLogger.debug('API', `Fetching drive tree for ${drive} (Page ${page})`)
    const result = await window.api.invoke(IPC_CHANNELS.DRIVE.GET_TREE, { drive, page, limit })
    clientLogger.info(
      'API',
      `Successfully fetched ${result?.nodes?.length || 0} nodes from ${drive}`
    )
    return result ?? { nodes: [], hasMore: false }
  },

  getDir: async (
    dirPath: string,
    page: number = 1,
    limit: number = ITEMS_IN_ONE_PAGE
  ): Promise<PaginatedResult<FileNode[]>> => {
    const result = await window.api.invoke(IPC_CHANNELS.DRIVE.GET_DIR, { dirPath, page, limit })
    return result ?? { nodes: [], hasMore: false }
  },

  findItemPage: async (dirPath: string, query: string): Promise<number | null> => {
    try {
      return await window.api.invoke(IPC_CHANNELS.DRIVE.FIND_PAGE, { dirPath, query })
    } catch {
      return null
    }
  },

  deepFindItem: async (
    dirPath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null> => {
    try {
      return await window.api.invoke(IPC_CHANNELS.DRIVE.DEEP_FIND, { dirPath, query })
    } catch {
      return null
    }
  }
}
