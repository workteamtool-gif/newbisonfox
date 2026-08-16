/**
 * The scanner pauses when the consumer queue is full,
 * and resumes when consumers drain it below the low-water mark.
 */
export class BackpressureGate {
  private blocked = false
  private resolve: (() => void) | null = null

  constructor(
    private highWaterMark: number,
    private lowWaterMark: number
  ) {}
  
  async waitIfNeeded(queueLength: number): Promise<void> {
    if (queueLength >= this.highWaterMark) {
      if (!this.blocked) {
        this.blocked = true
      }
      await new Promise<void>((resolveFn) => {
        this.resolve = resolveFn
      })
    }
  }

  notify(queueLength: number): void {
    if (this.blocked && queueLength <= this.lowWaterMark && this.resolve) {
      this.blocked = false
      const resolver = this.resolve
      this.resolve = null
      resolver()
    }
  }
}
