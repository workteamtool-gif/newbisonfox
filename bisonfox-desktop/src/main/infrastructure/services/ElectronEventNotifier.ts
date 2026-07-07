import { BrowserWindow } from 'electron'
import { IEventNotifier } from '../../domain/interfaces/IEventNotifier'

/**
 * Service that handles dispatching copy/upload status and progress events
 * from the Electron main process to the React renderer UI windows.
 */
export class ElectronEventNotifier implements IEventNotifier {
  /**
   * Sends progress updates to the active Electron renderer process webcontents.
   *
   * @param sessionId The unique ID of the current copy/upload session.
   * @param payload The progress payload containing counters, paths, and status.
   */
  notifyProgress(sessionId: string, payload: any): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(`upload-progress-${sessionId}`, payload)
    }
  }
}
