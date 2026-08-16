import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

const isDev = import.meta.env.DEV

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

const COLORS = {
  [LogLevel.DEBUG]: '#8b5cf6',
  [LogLevel.INFO]: '#0ea5e9',
  [LogLevel.WARN]: '#f59e0b',
  [LogLevel.ERROR]: '#ef4444'
}

export const clientLogger = {
  debug: (context: string, message: string, data?: any) =>
    log(LogLevel.DEBUG, context, message, data),
  info: (context: string, message: string, data?: any) =>
    log(LogLevel.INFO, context, message, data),
  warn: (context: string, message: string, data?: any) =>
    log(LogLevel.WARN, context, message, data),
  error: (context: string, message: string, error?: any) =>
    log(LogLevel.ERROR, context, message, error)
}

function log(level: LogLevel, context: string, message: string, data?: any): void {
  if (isDev) {
    console.log(
      `%c[${level}] [${context}] %c${message}`,
      `color: ${COLORS[level]}; font-weight: bold;`,
      'color: inherit;',
      data || ''
    )
  }

  if (level !== LogLevel.DEBUG) {
    sendToMainProcess(level, context, message, data)
  }
}

async function sendToMainProcess(
  level: LogLevel,
  context: string,
  message: string,
  data?: any
): Promise<void> {
  try {
    let enrichedMessage = message
    try {
      const store = await import('@renderer/store/useWizardStore')
      const { username, sessionId, currentSubfolder } = store.useWizardStore.getState()

      const parts: string[] = []
      if (username) parts.push(`User: ${username}`)
      if (sessionId) parts.push(`Session: ${sessionId}`)
      if (currentSubfolder) parts.push(`Subfolder: ${currentSubfolder}`)

      if (parts.length > 0) {
        enrichedMessage = `[${parts.join(' | ')}] ${message}`
      }
    } catch {}

    const sanitizedData =
      data instanceof Error ? { message: data.message, stack: data.stack } : data
    await window.api.invoke(IPC_CHANNELS.SYSTEM.LOG, {
      level,
      context,
      message: enrichedMessage,
      data: sanitizedData
    })
  } catch {}
}
