// ⚠️ CRITICAL: Must be the absolute first line before any other imports!
import { exec } from 'child_process'
// This unlocks Node's C++ I/O thread pool to match your Copy Engine concurrency.
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

// --- GLOBAL STATE ---
let appServices: { uploadManager: UploadManager } | null = null
let isShuttingDown = false

// --- LIFECYCLE: TEARDOWN ---
async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  // 1. Instantly abort all active copy engines and scanners
  if (appServices?.uploadManager) {
    appServices.uploadManager.cancelAllUploads()
  }

  // 2. Brief pause to allow File I/O finally blocks to execute and flush buffers
  await new Promise((resolve) => setTimeout(resolve, 500))

  await logger.flush()

  app.quit()
}

// --- LIFECYCLE: UI CREATION ---
function createWindow(): void {
  let mainWindow
  // Create the browser window.
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

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- LIFECYCLE: BOOTSTRAP ---
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.lightningfox')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 1. Register Core System IPC Handlers FIRST
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
          // On error, assume keyboard is present to avoid showing VK unexpectedly
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

  // 2. Initialize the backend engine and register domain IPC handlers
  appServices = setupApplication()

  // 2.a Keep-alive heartbeat log: first write immediately, then every 5 minutes
  startKeepAliveLogger()

  // 3. Finally, show the UI
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// --- SHUTDOWN EVENT LISTENERS ---

// 1. Triggered when the user clicks the "X" on the last window
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('Electron', 'All windows closed. Triggering shutdown.')
    gracefulShutdown()
  }
})

// 2. Triggered if they right-click the dock/taskbar and select "Quit"
app.on('before-quit', (event) => {
  if (!isShuttingDown) {
    event.preventDefault() // Pause the quit sequence!
    gracefulShutdown() // Run our teardown, which will safely call app.quit() at the end
  }
})

// 3. Triggered by Ctrl+C in terminal (Crucial for your dev environment)
process.on('SIGINT', () => {
  logger.info('System', 'SIGINT received (Ctrl+C).')
  gracefulShutdown()
})

// 4. Triggered by task manager kills or OS shutdown
process.on('SIGTERM', () => {
  logger.info('System', 'SIGTERM received.')
  gracefulShutdown()
})

// --- FATAL ERROR HANDLING ---
process.on('uncaughtException', (err) => {
  logger.error('Process', 'Uncaught Exception', { error: err.message, stack: err.stack })
})

process.on('unhandledRejection', (reason: any) => {
  logger.error('Process', 'Unhandled Rejection', { reason: reason?.message || reason })
})
