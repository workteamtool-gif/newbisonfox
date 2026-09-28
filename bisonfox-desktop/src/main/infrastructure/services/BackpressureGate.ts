/**
 * The scanner pauses when the consumer queue is full,
 * and resumes when consumers drain it below the low-water mark.
 */
export class BackpressureGate {
  private blocked = false
  private waiters: Array<() => void> = []

  constructor(
    private highWaterMark: number,
    private lowWaterMark: number
  ) {}
  
  async waitIfNeeded(signal?: AbortSignal): Promise<void> {
    if (this.blocked) {
      await new Promise<void>((resolveWaiter) => {
        if (signal?.aborted) return resolveWaiter()

        const onAbort = () => resolveWaiter()
        if (signal) signal.addEventListener('abort', onAbort)

        this.waiters.push(() => {
          if (signal) signal.removeEventListener('abort', onAbort)
          resolveWaiter()
        })
      })
    }
  }

  update(queueLength: number): void {
    if (!this.blocked && queueLength >= this.highWaterMark) {
      this.blocked = true
    } else if (this.blocked && queueLength <= this.lowWaterMark) {
      this.blocked = false
      if (this.waiters.length > 0) {
        const currentWaiters = this.waiters
        this.waiters = []
        currentWaiters.forEach(resolveWaiter => resolveWaiter())
      }
    }
  }
}
