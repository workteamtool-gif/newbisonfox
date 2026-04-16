import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: (channel: string, data?: any) => Promise<any>
      on: (channel: string, callback: (data: any) => void) => () => void
    }
  }
}
