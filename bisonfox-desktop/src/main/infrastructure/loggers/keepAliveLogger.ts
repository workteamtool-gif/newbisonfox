import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { exec } from 'child_process'
import { logger } from '@main/infrastructure/loggers/Logger'

import { config } from '@main/appConfig'

const KEEP_ALIVE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

function resolveKeepAliveDir(): string | null {
  let envPath = ''
  try {
    envPath = config.keepAliveLogDir
  } catch {}
  if (!envPath || envPath.trim() === '') {
    logger.warn('KeepAlive', 'keepAliveLogDir is not configured')
    return null
  }

  return path.resolve(envPath)
}

function ensureKeepAliveDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces()
  const addresses: string[] = []

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal && entry.address) {
        addresses.push(entry.address)
      }
    }
  }

  return addresses.length > 0 ? addresses : ['unknown']
}

function getMacAddresses(): string[] {
  const interfaces = os.networkInterfaces()
  const macs: string[] = []

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.mac && entry.mac !== '00:00:00:00:00:00' && !entry.internal) {
        macs.push(entry.mac)
      }
    }
  }

  return macs.length > 0 ? Array.from(new Set(macs)) : ['unknown']
}

function parseSerialFromWmic(output: string): string {
  const match = output.match(/SerialNumber\s*=\s*(.+)/i)
  return match?.[1]?.trim() || 'unknown'
}

async function getSystemSerialNumber(): Promise<string> {
  const platform = process.platform
  try {
    if (platform === 'win32') {
      return await new Promise((resolve) => {
        exec('wmic bios get serialnumber /value', { timeout: 5000 }, (err, stdout) => {
          if (err) {
            resolve('unknown')
            return
          }
          resolve(parseSerialFromWmic(stdout))
        })
      })
    }
  } catch {}

  return 'unknown'
}

function getKeepAliveFilePath(dir: string, timestamp: string): string {
  const safeTimestamp = timestamp.replace(/:/g, '-').replace(/\./g, '-')
  return path.join(dir, `keep-alive-${safeTimestamp}-${uuidv4()}.json`)
}

function writeKeepAliveEntry(dir: string, entry: Record<string, unknown>, timestamp: string): void {
  try {
    const filePath = getKeepAliveFilePath(dir, timestamp)
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8')
  } catch (err) {
    logger.warn('KeepAlive', 'Failed to write keep-alive log', { error: (err as Error).message })
  }
}

export async function logKeepAliveHeartbeat(): Promise<void> {
  const dir = resolveKeepAliveDir()
  if (!dir) return

  ensureKeepAliveDir(dir)

  const [serialNumber, ipAddresses] = await Promise.all([
    getSystemSerialNumber(),
    Promise.resolve(getLocalIpAddresses())
  ])

  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    serialNumber,
    ipAddresses,
    macAddresses: getMacAddresses()
  }

  writeKeepAliveEntry(dir, entry, timestamp)
  logger.info('KeepAlive', 'Heartbeat written', entry)
}

export function startKeepAliveLogger(): NodeJS.Timeout | null {
  const dir = resolveKeepAliveDir()
  if (!dir) return null

  ensureKeepAliveDir(dir)

  void logKeepAliveHeartbeat()

  return setInterval(() => {
    void logKeepAliveHeartbeat()
  }, KEEP_ALIVE_INTERVAL_MS)
}
