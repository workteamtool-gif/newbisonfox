import { exec } from 'child_process'
import './env'

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { logger } from '@main/infrastructure/loggers/Logger'
import { setupApplication } from './setup'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { UploadManager } from './application/UploadManager'
import { startKeepAliveLogger } from '@main/infrastructure/loggers/keepAliveLogger'
import { config } from './appConfig'

let appServices: { uploadManager: UploadManager } | null = null
let isShuttingDown = false

async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  if (appServices?.uploadManager) {
    appServices.uploadManager.cancelAllUploads()
  }

  await new Promise((resolve) => setTimeout(resolve, 500))

  await logger.flush()
  await logger.moveToFinal()

  app.quit()
}

function createWindow(): void {
  let mainWindow
  if (is.dev) {
    mainWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })
  } else {
    mainWindow = new BrowserWindow({
      show: false,
      fullscreen: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.lightningfox')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.LOG, (_event, { level, context, message, data }) => {
    const fullContext = `CLIENT:${context}`
    if (level === 'ERROR') logger.error(fullContext, message, data)
    else if (level === 'WARN') logger.warn(fullContext, message, data)
    else logger.info(fullContext, message, data)
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.DETECT_KEYBOARD, () => {
    return new Promise<{ hasKeyboard: boolean }>((resolve) => {
      const cmd =
        'powershell -NoProfile -Command "(Get-WmiObject Win32_Keyboard | Measure-Object).Count"'
      exec(cmd, { timeout: 5000 }, (err, stdout) => {
        if (err) {
          resolve({ hasKeyboard: true })
          return
        }
        const count = parseInt(stdout.trim(), 10)
        const hasKeyboard = !isNaN(count) && count > 0
        resolve({ hasKeyboard })
      })
    })
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_CONFIG, () => {
    return config
  })

  appServices = setupApplication()

  startKeepAliveLogger()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('Electron', 'All windows closed. Triggering shutdown.')
    gracefulShutdown()
  }
})

app.on('before-quit', (event) => {
  if (!isShuttingDown) {
    event.preventDefault()
    gracefulShutdown()
  }
})

// Triggered by Ctrl+C in terminal (Crucial for your dev environment)
process.on('SIGINT', () => {
  logger.info('System', 'SIGINT received (Ctrl+C).')
  gracefulShutdown()
})

// Triggered by task manager kills or OS shutdown
process.on('SIGTERM', () => {
  logger.info('System', 'SIGTERM received.')
  gracefulShutdown()
})

process.on('uncaughtException', (err) => {
  logger.error('Process', 'Uncaught Exception', { error: err.message, stack: err.stack })
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Process', 'Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason)
  })
})
