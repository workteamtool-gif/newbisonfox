export interface EventNotifier {
  notifyProgress(sessionId: string, payload: any): void
  notifyCount(scanId: string, payload: any): void
}
