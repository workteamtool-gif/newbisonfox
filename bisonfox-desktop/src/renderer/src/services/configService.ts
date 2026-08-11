export interface AppConfig {
  rawUploadFinalDir: string
  endpointDestinationFolder: string
  logDir: string
  keepAliveDir: string
  mailDir: string
  itemsInOnePage: number
  copyConcurrency: number
  deepSearchConcurrency: number
  heavyFileThresholdMb: number
  reportCopiedFilesIntervalMs: number
  maxReportedFailures: number
  failIntervalMs: number
  failRetries: number
  moveRetries: number
  blacklistDrives: string
  subfolderLength: number
  usernameLength: number
  specialCodeLength: number
  reusableCodesDir: string
  disposableCodesDir: string
  usedCodesDir: string
  uploadFinalRestrictedDir: string
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

  configPromise = window.api.invoke('get-config') as Promise<AppConfig>
  try {
    cachedConfig = await configPromise
    return cachedConfig!
  } catch (error) {
    console.error('Failed to load configuration via IPC', error)
    throw error
  }
}
