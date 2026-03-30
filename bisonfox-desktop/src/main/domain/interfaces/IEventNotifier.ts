export interface IEventNotifier {
  notifyProgress(sessionId: string, payload: any): void
}
