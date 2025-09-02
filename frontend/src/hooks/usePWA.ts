import { useState, useEffect } from 'react';
import { OfflineStorage, OfflineQueue } from '../utils/offlineStorage';

interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
  isLoading: boolean;
}

export const usePWA = () => {
  const [state, setState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    canInstall: false,
    hasUpdate: false,
    isLoading: false,
  });

  useEffect(() => {
    // 检查是否已安装
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      
      setState(prev => ({
        ...prev,
        isInstalled: isStandalone || isInWebAppiOS
      }));
    };

    // 监听网络状态变化
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // 网络恢复时处理离线队列
      OfflineQueue.processQueue();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    // 监听安装提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ ...prev, canInstall: true }));
    };

    // 监听应用安装事件
    const handleAppInstalled = () => {
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        canInstall: false 
      }));
    };

    checkInstallStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 缓存数据到离线存储
  const cacheData = async (key: string, data: any): Promise<boolean> => {
    return OfflineStorage.setItem(key, data);
  };

  // 从离线存储获取数据
  const getCachedData = <T>(key: string): T | null => {
    return OfflineStorage.getItem<T>(key);
  };

  // 添加请求到离线队列
  const addToOfflineQueue = (request: {
    type: string;
    url: string;
    method: string;
    data?: any;
  }): boolean => {
    return OfflineQueue.addToQueue({
      ...request,
      timestamp: Date.now()
    });
  };

  // 获取存储使用情况
  const getStorageInfo = () => {
    return OfflineStorage.getStorageInfo();
  };

  // 清理缓存
  const clearCache = (): boolean => {
    return OfflineStorage.clear();
  };

  return {
    ...state,
    cacheData,
    getCachedData,
    addToOfflineQueue,
    getStorageInfo,
    clearCache,
  };
};