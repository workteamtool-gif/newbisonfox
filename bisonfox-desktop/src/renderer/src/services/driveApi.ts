import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'

const ITEMS_IN_ONE_PAGE = Number(import.meta.env.VITE_ITEMS_IN_ONE_PAGE) || 48

export const driveApi = {
  listDrives: async (): Promise<DriveInfo[]> => {
    const result = await window.api.invoke(IPC_CHANNELS.DRIVE.LIST)
    return result ?? []
  },

  getDriveTree: async (
    drive: string,
    page: number = 1,
    limit: number = ITEMS_IN_ONE_PAGE
  ): Promise<PaginatedResult<ItemNode[]>> => {
    const result = await window.api.invoke(IPC_CHANNELS.DRIVE.GET_TREE, { drive, page, limit })
    return result ?? { nodes: [], hasMore: false }
  },

  getDir: async (
    dirPath: string,
    page: number = 1,
    limit: number = ITEMS_IN_ONE_PAGE
  ): Promise<PaginatedResult<ItemNode[]>> => {
    const result = await window.api.invoke(IPC_CHANNELS.DRIVE.GET_DIR, { dirPath, page, limit })
    return result ?? { nodes: [], hasMore: false, totalPages: 1 }
  },

  getDirCount: async (dirPath: string): Promise<number> => {
    try {
      return await window.api.invoke('get-dir-count', { dirPath })
    } catch {
      return 0
    }
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
