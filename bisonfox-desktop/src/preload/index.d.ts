import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: (channel: string, data?: unknown) => Promise<unknown>
      on: (channel: string, callback: (data: unknown) => void) => () => void
    }
  }
}
