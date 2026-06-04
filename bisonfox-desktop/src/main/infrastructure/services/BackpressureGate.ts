/**
 * Backpressure gate: the scanner pauses when the consumer queue is full,
 * and resumes when consumers drain it below the low-water mark.
 */
export class BackpressureGate {
  private blocked = false
  private resolve: (() => void) | null = null

  constructor(
    private highWaterMark: number,
    private lowWaterMark: number
  ) {}

  /**
   * Called by the scanner before pushing new items.
   * Blocks if the current queue size meets or exceeds the high-water mark.
   *
   * @param queueLength The current number of items waiting in the copy queue.
   */
  async waitIfNeeded(queueLength: number): Promise<void> {
    if (queueLength >= this.highWaterMark) {
      if (!this.blocked) {
        this.blocked = true
      }
      await new Promise<void>((r) => {
        this.resolve = r
      })
    }
  }

  notify(queueLength: number): void {
    if (this.blocked && queueLength <= this.lowWaterMark && this.resolve) {
      this.blocked = false
      const r = this.resolve
      this.resolve = null
      r()
    }
  }
}
