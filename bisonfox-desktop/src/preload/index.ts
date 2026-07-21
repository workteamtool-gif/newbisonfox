import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const customApi = {
  invoke: (channel: string, data?: unknown) => ipcRenderer.invoke(channel, data),

  on: (channel: string, callback: (data: unknown) => void) => {
    const subscription = (_event: unknown, data: unknown): void => callback(data)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', customApi)
  } catch (error) {
    console.error('Failed to expose APIs to context bridge:', error)
  }
} else {
  // Fallback for older/disabled isolation setups (Not recommended, but standard boilerplate)
  // @ts-expect-error (Defined in d.ts)
  window.electron = electronAPI
  // @ts-expect-error (Defined in d.ts)
  window.api = customApi
}
