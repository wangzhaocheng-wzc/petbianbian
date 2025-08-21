import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor, measureExecutionTime } from '../utils/performance';

/**
 * 性能监控Hook
 */
export const usePerformance = () => {
  const metricsRef = useRef<any>({});

  useEffect(() => {
    // 组件挂载时开始监控
    const startTime = performance.now();

    return () => {
      // 组件卸载时记录生命周期时间
      const endTime = performance.now();
      metricsRef.current.componentLifetime = endTime - startTime;
    };
  }, []);

  const measureRender = useCallback(<T,>(fn: () => T, label?: string): T => {
    return measureExecutionTime(fn, label);
  }, []);

  const getMetrics = useCallback(() => {
    return {
      ...performanceMonitor.getMetrics(),
      ...metricsRef.current,
    };
  }, []);

  return {
    measureRender,
    getMetrics,
  };
};

/**
 * 图片懒加载Hook
 */
export const useLazyLoad = (threshold = 0.1) => {
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 触发加载
            element.setAttribute('data-loaded', 'true');
            observerRef.current?.unobserve(element);
          }
        });
      },
      { threshold }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  return elementRef;
};

/**
 * 防抖Hook
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<number>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * 节流Hook
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
};

/**
 * 虚拟滚动Hook
 */
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const scrollTopRef = useRef(0);
  const startIndex = Math.floor(scrollTopRef.current / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((scrollTop: number) => {
    scrollTopRef.current = scrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
};

/**
 * 内存使用监控Hook
 */
export const useMemoryMonitor = () => {
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }, []);

  const logMemoryUsage = useCallback((label?: string) => {
    const usage = getMemoryUsage();
    if (usage) {
      console.log(`${label || 'Memory Usage'}:`, {
        used: `${(usage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(usage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(usage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        percentage: `${usage.usagePercentage.toFixed(2)}%`,
      });
    }
  }, [getMemoryUsage]);

  return {
    getMemoryUsage,
    logMemoryUsage,
  };
};

/**
 * 网络状态监控Hook
 */
export const useNetworkStatus = () => {
  const getNetworkInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return null;
  }, []);

  const isSlowConnection = useCallback(() => {
    const info = getNetworkInfo();
    if (!info) return false;
    
    return (
      info.effectiveType === 'slow-2g' ||
      info.effectiveType === '2g' ||
      info.saveData
    );
  }, [getNetworkInfo]);

  return {
    getNetworkInfo,
    isSlowConnection,
    isOnline: navigator.onLine,
  };
};