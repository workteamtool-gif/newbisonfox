import * as fs from 'original-fs'
import { AsyncSemaphore } from '../AsyncSemaphore'
import { config } from '@main/appConfig'

const HEAVY_FILE_THRESHOLD = config.heavyFileThresholdMb * 1024 * 1024
const heavyLock = new AsyncSemaphore(4)

/**
 * Checks file size first, and if it exceeds the heavy threshold, acquires a permit
 * from `heavyLock` to limit simultaneous large-file network and disk I/O.
 *
 * @param src The source file path.
 * @param dest The destination file path.
 * @param bufferSize The highWaterMark size for the streams.
 * @param signal Optional AbortSignal to cancel the copy.
 * @param onProgressBytes Callback to report bytes transferred.
 * @returns A promise resolving to the file size in bytes upon success.
 */
export async function copyOneFast(
  src: string,
  dest: string,
  bufferSize: number,
  signal?: AbortSignal,
  onProgressBytes?: (chunkSize: number) => void
): Promise<number> {
  const st = await fs.promises.stat(src).catch(() => null)
  if (!st) throw new Error('File not accessible')

  if (signal?.aborted) return 0

  const doCopy = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let aborted = false
      let stallTimer: NodeJS.Timeout | null = null

      const clearStall = () => {
        if (stallTimer) {
          clearTimeout(stallTimer)
          stallTimer = null
        }
      }

      const onAbort = () => {
        aborted = true
        clearStall()
        readStream.destroy()
        writeStream.destroy()
        reject(new Error('Aborted'))
      }

      if (signal) {
        if (signal.aborted) return reject(new Error('Aborted'))
        signal.addEventListener('abort', onAbort)
      }

      const FILE_FLAG_SEQUENTIAL_SCAN = 0x08000000
      const readStream = fs.createReadStream(src, {
        flags: (fs.constants.O_RDONLY | FILE_FLAG_SEQUENTIAL_SCAN) as unknown as string,
        highWaterMark: bufferSize
      })
      const writeStream = fs.createWriteStream(dest, {
        flags: (fs.constants.O_WRONLY |
          fs.constants.O_CREAT |
          fs.constants.O_TRUNC |
          FILE_FLAG_SEQUENTIAL_SCAN) as unknown as string,
        highWaterMark: bufferSize
      })

      const resetStall = () => {
        clearStall()
        stallTimer = setTimeout(() => {
          if (aborted) return
          aborted = true
          readStream.destroy()
          writeStream.destroy()
          reject(new Error('Copy stalled - no data transferred for 10 seconds'))
        }, 10000)
      }

      // Start the timer immediately in case the stream hangs on initial open
      resetStall()

      readStream.on('data', (chunk) => {
        if (aborted) return
        resetStall()
        if (onProgressBytes) onProgressBytes(chunk.length)
      })

      readStream.on('error', (err) => {
        clearStall()
        if (signal) signal.removeEventListener('abort', onAbort)
        writeStream.destroy()
        reject(err)
      })

      writeStream.on('error', (err) => {
        clearStall()
        if (signal) signal.removeEventListener('abort', onAbort)
        readStream.destroy()
        reject(err)
      })

      writeStream.on('finish', () => {
        clearStall()
        if (signal) signal.removeEventListener('abort', onAbort)
        resolve()
      })

      readStream.pipe(writeStream)
    })
  }

  if (st.size > HEAVY_FILE_THRESHOLD) {
    await heavyLock.acquire()
    try {
      if (signal?.aborted) return 0
      await doCopy()
    } finally {
      heavyLock.release()
    }
    return st.size
  }

  await doCopy()
  return st.size
}
