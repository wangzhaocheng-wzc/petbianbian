// Service Worker for caching and offline functionality
const CACHE_NAME = 'pet-health-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // 添加其他静态资源
];

// 需要缓存的API端点
const CACHEABLE_APIS = [
  '/api/pets',
  '/api/community/posts',
  '/api/users/profile',
];

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 静态资源缓存策略：缓存优先
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image') {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              // 只缓存成功的响应
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
        .catch(() => {
          // 离线时的后备方案
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
    return;
  }

  // API请求缓存策略：网络优先，缓存后备
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 只缓存GET请求的成功响应
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            
            // 检查是否是可缓存的API
            const isCacheable = CACHEABLE_APIS.some(api => 
              url.pathname.startsWith(api)
            );
            
            if (isCacheable) {
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
          }
          return response;
        })
        .catch(() => {
          // 网络失败时从缓存返回
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // 返回离线页面或错误响应
              return new Response(
                JSON.stringify({ 
                  error: 'Network unavailable', 
                  offline: true 
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }
});

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 执行后台同步任务
      syncData()
    );
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icon-explore.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('宠物健康监测', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 数据同步函数
async function syncData() {
  try {
    // 获取离线时存储的数据
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // 重新发送失败的请求
    for (const request of requests) {
      if (request.method !== 'GET') {
        try {
          await fetch(request);
          await cache.delete(request);
        } catch (error) {
          console.log('Sync failed for:', request.url);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// 缓存管理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.payload;
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(urls))
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
    );
  }
});