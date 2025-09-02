import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始检查网络状态
    if (!navigator.onLine) {
      setShowOfflineMessage(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 自动隐藏在线消息
  useEffect(() => {
    if (isOnline && showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOfflineMessage]);

  if (!showOfflineMessage && isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 px-4 safe-area-inset-top ${
        showOfflineMessage ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div
        className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg max-w-screen-xs ${
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">网络已连接</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">网络已断开，正在离线模式下运行</span>
              <span className="sm:hidden">离线模式</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;