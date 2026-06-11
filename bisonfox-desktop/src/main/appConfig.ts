import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { z } from 'zod'
import { is } from '@electron-toolkit/utils'

// 1. Define the Zod schema for configuration
const configSchema = z.object({
  uploadBaseDir: z.string().min(1, 'Upload base directory must be provided'),
  endpointDestinationFolder: z.string().min(1, 'Endpoint destination folder must be provided'),
  logDir: z.string().min(1, 'Log directory must be provided'),
  keepAliveLogDir: z.string().min(1, 'Keep-alive log directory must be provided'),
  mailLogDir: z.string().min(1, 'Mail log directory must be provided'),
  itemsInOnePage: z.number().int().positive().default(24),
  copyConcurrency: z.number().int().positive().default(32),
  deepSearchConcurrency: z.number().int().positive().default(32),
  heavyFileThresholdMb: z.number().int().positive().default(100),
  reportCopiedFilesIntervalMs: z.number().int().positive().default(500),
  maxReportedFailures: z.number().int().positive().default(10),
  failIntervalMs: z.number().int().positive().default(500),
  failRetries: z.number().int().nonnegative().default(5),
  blacklistDrives: z.string().default('Z:'),
  subfolderLength: z.number().int().positive().default(20),
  usernameLength: z.number().int().positive().default(30)
})

export type AppConfig = z.infer<typeof configSchema>

let cachedConfig: AppConfig | null = null

function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    // In dev mode, use project root. In prod, use the folder containing the exe.
    const baseDir = is.dev ? path.resolve(process.cwd()) : path.dirname(app.getPath('exe'))

    const configPath = path.join(baseDir, 'config.json')

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`)
    }

    const rawConfig = fs.readFileSync(configPath, 'utf8')
    const parsedJson = JSON.parse(rawConfig)

    // Validate using zod
    const validationResult = configSchema.safeParse(parsedJson)

    if (!validationResult.success) {
      console.error('Configuration validation failed:', validationResult.error.format())
      // We log to console here because the logger might not be fully initialized yet
      // if it depends on config values.
      throw new Error('Invalid configuration format in config.json')
    }

    cachedConfig = validationResult.data
    return cachedConfig
  } catch (error) {
    console.error('Failed to load application configuration:', error)
    // Re-throw or provide default fallback. For now, it's critical to have a valid config.
    throw error
  }
}

export const config = loadConfig()
