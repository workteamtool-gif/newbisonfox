import { CopyOptions, CopySummary } from '@main/domain/interfaces/FileService'
import { FileScanner } from '@main/domain/interfaces/FileScanner'
import { CopyEngineCore } from './copyEngine/CopyEngineCore'

/**
 * Executes a concurrent, throttled copy sequence that migrates selected paths to a target directory.
 * Utilizes FileScanner to continuously discover paths in the background while workers process the queue.
 * Integrates `BackpressureGate` to limit memory growth and applies automatic retries on worker failures.
 *
 * @param scanner The scanner implementation used to walk directories in parallel.
 * @param initialPaths Array of file or directory paths to copy.
 * @param destination Target directory to copy files to.
 * @param options Copy options and progress/scanning callback configuration.
 */
export async function copyFiles(
  scanner: FileScanner,
  initialPaths: string[],
  destination: string,
  options: CopyOptions
): Promise<CopySummary> {
  const engine = new CopyEngineCore(scanner, initialPaths, destination, options)
  return engine.start()
}
