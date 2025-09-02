// Service Worker for Pet Health Platform
const CACHE_NAME = 'pet-health-v1';
const STATIC_CACHE = 'pet-health-static-v1';
const DYNAMIC_CACHE = 'pet-health-dynamic-v1';
const API_CACHE = 'pet-health-api-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html', // 离线页面
];

// API缓存策略配置
const API_CACHE_CONFIG = {
  '/api/pets': { strategy: 'NetworkFirst', maxAge: 300 }, // 5分钟
  '/api/records': { strategy: 'NetworkFirst', maxAge: 300 },
  '/api/community/posts': { strategy: 'NetworkFirst', maxAge: 180 }, // 3分钟
  '/api/analysis': { strategy: 'NetworkOnly' }, // 分析请求不缓存
};

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// 获取事件
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非GET请求和chrome-extension请求
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // API请求处理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // 静态资源处理
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }
  
  // 图片资源处理
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // 其他资源使用缓存优先策略
  event.respondWith(handleOtherRequest(request));
});

// 处理API请求
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // 查找匹配的缓存配置
  const cacheConfig = Object.keys(API_CACHE_CONFIG).find(pattern => 
    pathname.startsWith(pattern)
  );
  
  if (!cacheConfig) {
    // 没有配置的API请求，直接网络请求
    return fetch(request);
  }
  
  const config = API_CACHE_CONFIG[cacheConfig];
  
  switch (config.strategy) {
    case 'NetworkFirst':
      return networkFirst(request, API_CACHE, config.maxAge);
    case 'CacheFirst':
      return cacheFirst(request, API_CACHE, config.maxAge);
    case 'NetworkOnly':
      return fetch(request);
    default:
      return fetch(request);
  }
}

// 处理文档请求
async function handleDocumentRequest(request) {
  try {
    // 尝试网络请求
    const networkResponse = await fetch(request);
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 网络失败时从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回离线页面
    return caches.match('/offline.html');
  }
}

// 处理图片请求
async function handleImageRequest(request) {
  return cacheFirst(request, DYNAMIC_CACHE, 86400); // 1天
}

// 处理其他请求
async function handleOtherRequest(request) {
  return cacheFirst(request, DYNAMIC_CACHE, 3600); // 1小时
}

// 网络优先策略
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // 添加时间戳用于过期检查
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // 检查缓存是否过期
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (cacheTimestamp) {
        const age = (Date.now() - parseInt(cacheTimestamp)) / 1000;
        if (age > maxAge) {
          // 缓存过期，删除并返回网络错误
          const cache = await caches.open(cacheName);
          cache.delete(request);
          throw error;
        }
      }
      
      return cachedResponse;
    }
    
    throw error;
  }
}

// 缓存优先策略
async function cacheFirst(request, cacheName, maxAge) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // 检查缓存是否过期
    const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
    if (cacheTimestamp) {
      const age = (Date.now() - parseInt(cacheTimestamp)) / 1000;
      if (age <= maxAge) {
        return cachedResponse;
      }
    } else {
      // 没有时间戳的旧缓存，直接返回
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // 网络失败时返回过期的缓存
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 监听消息事件
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// 清理所有缓存
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// 后台同步事件（如果支持）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  console.log('Service Worker: Background sync');
  // 这里可以处理离线时排队的请求
  // 例如：发送离线时创建的帖子、分析请求等
}

// 推送通知事件
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1
      },
      actions: [
        {
          action: 'explore',
          title: '查看详情',
          icon: '/pwa-192x192.png'
        },
        {
          action: 'close',
          title: '关闭',
          icon: '/pwa-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});