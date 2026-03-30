/// <reference types="vite/client" />

interface Window {
  api: {
    invoke: (channel: string, data?: any) => Promise<any>
    on: (channel: string, callback: (data: any) => void) => () => void
  }
}
