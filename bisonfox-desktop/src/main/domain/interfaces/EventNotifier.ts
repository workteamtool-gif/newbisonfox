export interface EventNotifier {
  notifyProgress(sessionId: string, payload: any): void
}
