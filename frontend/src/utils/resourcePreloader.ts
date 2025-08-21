/**
 * 资源预加载工具
 */

export interface PreloadOptions {
  priority?: 'high' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch';
}

/**
 * 预加载资源
 */
export const preloadResource = (
  href: string,
  options: PreloadOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    
    if (options.as) {
      link.as = options.as;
    }
    
    if (options.crossOrigin) {
      link.crossOrigin = options.crossOrigin;
    }
    
    if (options.priority) {
      link.setAttribute('importance', options.priority);
    }

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${href}`));

    document.head.appendChild(link);
  });
};

/**
 * 预加载图片
 */
export const preloadImages = (urls: string[]): Promise<HTMLImageElement[]> => {
  return Promise.all(
    urls.map(url => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      });
    })
  );
};

/**
 * 预加载字体
 */
export const preloadFont = (
  fontUrl: string,
  fontFamily?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = fontUrl;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';

    link.onload = () => {
      // 如果提供了字体族名称，创建字体面
      if (fontFamily) {
        const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
        fontFace.load().then(() => {
          document.fonts.add(fontFace);
          resolve();
        }).catch(reject);
      } else {
        resolve();
      }
    };
    
    link.onerror = () => reject(new Error(`Failed to preload font: ${fontUrl}`));
    document.head.appendChild(link);
  });
};

/**
 * 预加载脚本
 */
export const preloadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 首先预加载
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.href = src;
    preloadLink.as = 'script';
    document.head.appendChild(preloadLink);

    // 然后实际加载脚本
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

/**
 * 预加载样式表
 */
export const preloadStylesheet = (href: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'style';
    link.onload = () => {
      // 预加载完成后，实际应用样式
      link.rel = 'stylesheet';
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to preload stylesheet: ${href}`));
    document.head.appendChild(link);
  });
};

/**
 * 预取资源（低优先级）
 */
export const prefetchResource = (href: string): void => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
};

/**
 * DNS预解析
 */
export const preconnectDomain = (domain: string): void => {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = domain;
  document.head.appendChild(link);
};

/**
 * 资源预加载管理器
 */
export class ResourcePreloader {
  private preloadedResources = new Set<string>();
  private preloadQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  /**
   * 添加资源到预加载队列
   */
  addToQueue(
    href: string,
    options: PreloadOptions = {}
  ): void {
    if (this.preloadedResources.has(href)) {
      return;
    }

    this.preloadQueue.push(() => {
      this.preloadedResources.add(href);
      return preloadResource(href, options);
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * 批量添加图片到预加载队列
   */
  addImagesToQueue(urls: string[]): void {
    urls.forEach(url => {
      if (!this.preloadedResources.has(url)) {
        this.preloadQueue.push(() => {
          this.preloadedResources.add(url);
          return preloadImages([url]).then(() => {});
        });
      }
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * 处理预加载队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const preloadTask = this.preloadQueue.shift();
      if (preloadTask) {
        try {
          await preloadTask();
        } catch (error) {
          console.warn('Preload failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.preloadQueue = [];
    this.isProcessing = false;
  }

  /**
   * 获取已预加载的资源列表
   */
  getPreloadedResources(): string[] {
    return Array.from(this.preloadedResources);
  }
}

/**
 * 智能预加载：根据用户行为预测需要的资源
 */
export class IntelligentPreloader {
  private hoverTimer: number | null = null;
  private preloader = new ResourcePreloader();

  constructor() {
    this.initializeHoverPreloading();
  }

  /**
   * 初始化悬停预加载
   */
  private initializeHoverPreloading(): void {
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href) {
        this.hoverTimer = window.setTimeout(() => {
          this.preloadPage(link.href);
        }, 200); // 200ms延迟，避免误触发
      }
    });

    document.addEventListener('mouseout', () => {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    });
  }

  /**
   * 预加载页面资源
   */
  private preloadPage(href: string): void {
    // 预取页面HTML
    prefetchResource(href);
    
    // 可以根据路由预测需要的资源
    if (href.includes('/analysis')) {
      this.preloader.addToQueue('/api/pets', { as: 'fetch' });
    } else if (href.includes('/community')) {
      this.preloader.addToQueue('/api/community/posts', { as: 'fetch' });
    }
  }

  /**
   * 根据路由预加载关键资源
   */
  preloadForRoute(route: string): void {
    const routeResources: Record<string, string[]> = {
      '/analysis': ['/api/pets'],
      '/records': ['/api/records'],
      '/community': ['/api/community/posts'],
      '/profile': ['/api/users/profile'],
    };

    const resources = routeResources[route];
    if (resources) {
      resources.forEach(resource => {
        this.preloader.addToQueue(resource, { as: 'fetch' });
      });
    }
  }
}

// 创建全局预加载器实例
export const resourcePreloader = new ResourcePreloader();
export const intelligentPreloader = new IntelligentPreloader();