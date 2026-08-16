import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { config } from '../appConfig'
import { logger } from '../infrastructure/loggers/Logger'
import { registerSystemHandlers } from './systemHandlers'
import { registerSessionHandlers } from './sessionHandlers'
import { registerDriveHandlers } from './driveHandlers'
import { registerUploadHandlers } from './uploadHandlers'
import { AppDependencies } from '@main/domain/entities/AppDependencies'


export function registerIpcHandlers(dependencies: AppDependencies): void {
  const { diskService, fileService, hardwareService, uploadManager } = dependencies

  // Forwards client-side log events to the backend file logger
  ipcMain.handle(IPC_CHANNELS.SYSTEM.LOG, (_event, { level, context, message, data }) => {
    const fullContext = `CLIENT:${context}`
    if (level === 'ERROR') logger.error(fullContext, message, data)
    else if (level === 'WARN') logger.warn(fullContext, message, data)
    else logger.info(fullContext, message, data)
  })

  // Provides the full config object to the frontend on demand
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_CONFIG, () => {
    return config
  })

  // ─── Domain Handlers ─────────────────────────────────────────────────────
  registerSystemHandlers(hardwareService)
  registerSessionHandlers()
  registerDriveHandlers(diskService, fileService)
  registerUploadHandlers(fileService, uploadManager)
}
