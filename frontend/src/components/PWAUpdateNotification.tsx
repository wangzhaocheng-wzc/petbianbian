import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

const PWAUpdateNotification: React.FC = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 检查Service Worker更新
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // 监听Service Worker更新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新的Service Worker已安装，显示更新提示
                setShowUpdatePrompt(true);
              }
            });
          }
        });
      });

      // 监听Service Worker控制器变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // 页面被新的Service Worker控制，刷新页面
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // 告诉等待中的Service Worker跳过等待
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 z-50 safe-area-inset-bottom">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            应用更新可用
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            发现新版本，点击更新以获得最新功能和改进
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleUpdate}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
            >
              立即更新
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
            >
              稍后
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-500 active:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;