import { BrowserWindow } from 'electron'
import { IEventNotifier } from '../../domain/interfaces/IEventNotifier'

export class ElectronEventNotifier implements IEventNotifier {
  notifyProgress(sessionId: string, payload: any): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(`upload-progress-${sessionId}`, payload)
    }
  }
}
