import { BrowserWindow } from 'electron'
import { EventNotifier } from '@main/domain/interfaces/EventNotifier'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

export class ElectronEventNotifier implements EventNotifier {
  notifyProgress(sessionId: string, payload: any): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(`upload-progress-${sessionId}`, payload)
    }
  }

  notifyCount(scanId: string, payload: any): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(`${IPC_CHANNELS.UPLOAD.COUNT_PREFIX}${scanId}`, payload)
    }
  }
}
