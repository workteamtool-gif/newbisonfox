import './env'

import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { logger } from '@main/infrastructure/loggers/Logger'
import { setupApplication } from './setup'
import { startKeepAliveLogger } from '@main/infrastructure/loggers/keepAliveLogger'
import { UploadManager } from './application/UploadManager'

let appServices: { uploadManager: UploadManager } | null = null
let isShuttingDown = false

// Cancels all ongoing uploads, flushes pending logs to disk and quits the electron app
async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  // Cancel any active network/disk transfers safely
  if (appServices?.uploadManager) {
    appServices.uploadManager.cancelAllUploads()
  }

  // Brief delay to allow pending streams to close
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Ensure all logs are safely written to the final output directory
  await logger.flush()
  await logger.moveToFinalDir()

  app.quit()
}

function createWindow(): void {
  let mainWindow: BrowserWindow

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

  // Wait until the window is fully rendered before showing it to prevent visual flickering
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Prevent external links from opening new Electron windows (routes them to default OS browser instead)
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the React application
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Main application lifecycle hook.
 * Fires when Electron has finished initialization and is ready to create browser windows.
 */
app.whenReady().then(() => {
  // Set the application ID for Windows notifications
  electronApp.setAppUserModelId('com.lightningfox')

  //Triggered when a browser window is created
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ─── App Initialization ──────────────────────────────────────────────────

  // Bootstraps dependency injection, services, and all IPC routes
  appServices = setupApplication()

  startKeepAliveLogger()

  createWindow()
})

// ─── OS Event Listeners ──────────────────────────────────────────────────

// Triggered when the user closed the window of the application
app.on('window-all-closed', () => {
  logger.info('Electron', 'All windows closed. Triggering shutdown.')
  gracefulShutdown()
})

// Triggered when the application is about to be closed
app.on('before-quit', (event) => {
  if (!isShuttingDown) {
    event.preventDefault()
    gracefulShutdown()
  }
})

// Triggered when the user closed the window of the application using Ctrl+C in terminal
process.on('SIGINT', () => {
  logger.info('System', 'SIGINT received (Ctrl+C).')
  gracefulShutdown()
})

// Triggered by task manager kills, process managers, or OS shutdown
process.on('SIGTERM', () => {
  logger.info('System', 'SIGTERM received.')
  gracefulShutdown()
})

// Catch-all for unhandled synchronous errors to prevent silent crashes
process.on('uncaughtException', (err) => {
  logger.error('Process', 'Uncaught Exception', { error: err.message, stack: err.stack })
})

// Catch-all for unhandled Promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Process', 'Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason)
  })
})
