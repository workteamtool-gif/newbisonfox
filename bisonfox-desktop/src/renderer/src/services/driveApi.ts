import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'

import { getConfig } from '@renderer/services/configService'

export const driveApi = {
  listDrives: async (): Promise<DriveInfo[]> => {
    const result = (await window.api.invoke(IPC_CHANNELS.DRIVE.LIST)) as DriveInfo[] | undefined
    return result ?? []
  },

  getDriveTree: async (
    drive: string,
    page: number = 1,
    limit?: number
  ): Promise<PaginatedResult<ItemNode[]>> => {
    const config = await getConfig()
    const actualLimit = limit ?? config.itemsInOnePage
    const result = (await window.api.invoke(IPC_CHANNELS.DRIVE.GET_TREE, {
      drive,
      page,
      limit: actualLimit
    })) as PaginatedResult<ItemNode[]> | undefined
    return result ?? { nodes: [], hasMore: false, totalPages: 0 }
  },

  getDir: async (
    dirPath: string,
    page: number = 1,
    limit?: number
  ): Promise<PaginatedResult<ItemNode[]>> => {
    const config = await getConfig()
    const actualLimit = limit ?? config.itemsInOnePage
    const result = (await window.api.invoke(IPC_CHANNELS.DRIVE.GET_DIR, {
      dirPath,
      page,
      limit: actualLimit
    })) as PaginatedResult<ItemNode[]> | undefined
    return result ?? { nodes: [], hasMore: false, totalPages: 1 }
  },

  getDirCount: async (dirPath: string): Promise<number> => {
    try {
      return (await window.api.invoke(IPC_CHANNELS.DRIVE.GET_DIR_COUNT, { dirPath })) as number
    } catch {
      return 0
    }
  },

  findItemPage: async (dirPath: string, query: string): Promise<number | null> => {
    try {
      return (await window.api.invoke(IPC_CHANNELS.DRIVE.FIND_PAGE, { dirPath, query })) as number | null
    } catch {
      return null
    }
  },

  deepFindItem: async (
    dirPath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null> => {
    try {
      return (await window.api.invoke(IPC_CHANNELS.DRIVE.DEEP_FIND, {
        dirPath,
        query
      })) as { path: string; pages: Record<string, number> } | null
    } catch {
      return null
    }
  }
}
