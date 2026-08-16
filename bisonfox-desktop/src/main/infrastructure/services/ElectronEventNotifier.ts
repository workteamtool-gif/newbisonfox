import { BrowserWindow } from 'electron'
import { EventNotifier } from '../../domain/interfaces/EventNotifier'

export class ElectronEventNotifier implements EventNotifier {
  notifyProgress(sessionId: string, payload: any): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(`upload-progress-${sessionId}`, payload)
    }
  }
}
