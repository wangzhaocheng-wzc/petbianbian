// PWA相关类型定义
declare module 'virtual:pwa-register/react' {
  import type { Ref, MutableRefObject } from 'react'

  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (value: boolean) => void]
    offlineReady: [boolean, (value: boolean) => void]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}

// Service Worker相关类型
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}