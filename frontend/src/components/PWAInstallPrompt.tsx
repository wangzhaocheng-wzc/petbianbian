import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 检查是否为iOS设备
    const checkIfIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    };

    // 检查是否已经安装
    const checkIfInstalled = () => {
      // 检查是否在PWA模式下运行
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
      
      setIsInstalled(isStandalone || isInWebAppiOS || isInWebAppChrome);
    };

    checkIfIOS();
    checkIfInstalled();

    // 监听beforeinstallprompt事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 检查用户是否之前已经拒绝过安装
      const hasDeclined = localStorage.getItem('pwa-install-declined');
      const declineTime = hasDeclined ? parseInt(hasDeclined) : 0;
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 一周的毫秒数
      
      // 如果用户拒绝过且时间不到一周，不显示提示
      if (!hasDeclined || (now - declineTime) > oneWeek) {
        setShowInstallPrompt(true);
      }
    };

    // 监听应用安装事件
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-declined');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('用户接受了安装提示');
      } else {
        console.log('用户拒绝了安装提示');
        localStorage.setItem('pwa-install-declined', Date.now().toString());
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('安装提示出错:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-declined', Date.now().toString());
  };

  // 如果已经安装，则不渲染
  if (isInstalled) {
    return null;
  }

  // iOS设备显示不同的提示
  if (isIOS && !showInstallPrompt) {
    // 检查是否应该显示iOS安装提示
    const hasDeclinedIOS = localStorage.getItem('pwa-install-declined-ios');
    const declineTime = hasDeclinedIOS ? parseInt(hasDeclinedIOS) : 0;
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (!hasDeclinedIOS || (now - declineTime) > oneWeek) {
      return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 safe-area-inset-bottom">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900">
                添加到主屏幕
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                点击分享按钮 <span className="inline-block w-4 h-4 bg-blue-500 rounded text-white text-xs text-center leading-4">↗</span>，然后选择"添加到主屏幕"
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('pwa-install-declined-ios', Date.now().toString());
                }}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700"
              >
                我知道了
              </button>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('pwa-install-declined-ios', Date.now().toString());
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-500 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  // Android/Chrome安装提示
  if (!showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 safe-area-inset-bottom">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-orange-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            安装应用到桌面
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            将宠物健康平台添加到主屏幕，获得更好的使用体验
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 min-h-[44px]"
            >
              安装
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 min-h-[44px]"
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

export default PWAInstallPrompt;