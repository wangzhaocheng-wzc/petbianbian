/**
 * Service Worker 注册和管理工具
 */

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * 注册 Service Worker
 */
export const registerServiceWorker = async (
  swUrl: string = '/sw.js',
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    
    console.log('Service Worker registered successfully:', registration);

    // 监听更新
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // 有新版本可用
              console.log('New content is available; please refresh.');
              config.onUpdate?.(registration);
            } else {
              // 首次安装完成
              console.log('Content is cached for offline use.');
              config.onSuccess?.(registration);
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    config.onError?.(error as Error);
    return null;
  }
};

/**
 * 注销 Service Worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

/**
 * 更新 Service Worker
 */
export const updateServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('Service Worker updated');
  } catch (error) {
    console.error('Service Worker update failed:', error);
  }
};

/**
 * 跳过等待，立即激活新的 Service Worker
 */
export const skipWaiting = (): void => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
};

/**
 * 向 Service Worker 发送消息
 */
export const sendMessageToSW = (message: any): void => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    if (registration.active) {
      registration.active.postMessage(message);
    }
  });
};

/**
 * 缓存指定的 URLs
 */
export const cacheUrls = (urls: string[]): void => {
  sendMessageToSW({
    type: 'CACHE_URLS',
    payload: urls
  });
};

/**
 * 清除所有缓存
 */
export const clearAllCaches = (): void => {
  sendMessageToSW({
    type: 'CLEAR_CACHE'
  });
};

/**
 * 检查是否在线
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * 监听网络状态变化
 */
export const onNetworkChange = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  const handleOnline = () => {
    console.log('Network: Online');
    onOnline();
  };

  const handleOffline = () => {
    console.log('Network: Offline');
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // 返回清理函数
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * Service Worker 管理类
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  constructor(private config: ServiceWorkerConfig = {}) {}

  /**
   * 初始化 Service Worker
   */
  async initialize(swUrl: string = '/sw.js'): Promise<void> {
    this.registration = await registerServiceWorker(swUrl, {
      onUpdate: (registration) => {
        this.updateAvailable = true;
        this.config.onUpdate?.(registration);
      },
      onSuccess: this.config.onSuccess,
      onError: this.config.onError,
    });

    // 监听来自 Service Worker 的消息
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }

  /**
   * 处理来自 Service Worker 的消息
   */
  private handleMessage(data: any): void {
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.payload);
        break;
      case 'OFFLINE_READY':
        console.log('App ready for offline use');
        break;
      default:
        console.log('Unknown message from SW:', data);
    }
  }

  /**
   * 检查是否有更新可用
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * 应用更新
   */
  applyUpdate(): void {
    if (this.updateAvailable) {
      skipWaiting();
      window.location.reload();
    }
  }

  /**
   * 预缓存关键资源
   */
  precacheResources(urls: string[]): void {
    cacheUrls(urls);
  }

  /**
   * 获取缓存大小
   */
  async getCacheSize(): Promise<number> {
    if (!('storage' in navigator)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    clearAllCaches();
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    await unregisterServiceWorker();
    this.registration = null;
    this.updateAvailable = false;
  }
}

// 创建全局 Service Worker 管理器
export const swManager = new ServiceWorkerManager({
  onUpdate: (registration) => {
    // 可以在这里显示更新提示
    console.log('New version available! Please refresh the page.');
  },
  onSuccess: (registration) => {
    console.log('App is ready for offline use.');
  },
  onError: (error) => {
    console.error('Service Worker error:', error);
  },
});