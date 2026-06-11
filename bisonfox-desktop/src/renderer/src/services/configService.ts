export interface AppConfig {
  uploadBaseDir: string
  endpointDestinationFolder: string
  logDir: string
  keepAliveLogDir: string
  mailLogDir: string
  itemsInOnePage: number
  copyConcurrency: number
  deepSearchConcurrency: number
  heavyFileThresholdMb: number
  reportCopiedFilesIntervalMs: number
  maxReportedFailures: number
  failIntervalMs: number
  failRetries: number
  blacklistDrives: string
  subfolderLength: number
  usernameLength: number
}

let cachedConfig: AppConfig | null = null
let configPromise: Promise<AppConfig> | null = null

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  if (configPromise) {
    return configPromise
  }

  configPromise = window.api.invoke('get-config')
  try {
    cachedConfig = await configPromise
    return cachedConfig
  } catch (error) {
    console.error('Failed to load configuration via IPC', error)
    throw error
  }
}
