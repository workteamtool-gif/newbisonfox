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
    const sanitizedData =
      data instanceof Error ? { message: data.message, stack: data.stack } : data
    await window.api.invoke('log-from-client', {
      level,
      context,
      message,
      data: sanitizedData
    })
  } catch {
    // Fail silently - never let a logging failure crash the UI
  }
}
