// 详细的导航调试脚本 - 监控路由变化和认证状态
console.log('=== 开始详细导航调试 ===');

// 1. 监控路由变化
let currentPath = window.location.pathname;
console.log('初始路径:', currentPath);

// 监听 popstate 事件
window.addEventListener('popstate', (event) => {
  console.log('🔄 popstate事件触发:', {
    oldPath: currentPath,
    newPath: window.location.pathname,
    state: event.state,
    timestamp: new Date().toISOString()
  });
  currentPath = window.location.pathname;
});

// 监听 pushstate 和 replacestate
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  console.log('🔄 pushState调用:', {
    oldPath: currentPath,
    newPath: args[2] || window.location.pathname,
    state: args[0],
    title: args[1],
    timestamp: new Date().toISOString(),
    stack: new Error().stack.split('\n').slice(1, 6)
  });
  currentPath = args[2] || window.location.pathname;
  return originalPushState.apply(this, args);
};

history.replaceState = function(...args) {
  console.log('🔄 replaceState调用:', {
    oldPath: currentPath,
    newPath: args[2] || window.location.pathname,
    state: args[0],
    title: args[1],
    timestamp: new Date().toISOString(),
    stack: new Error().stack.split('\n').slice(1, 6)
  });
  currentPath = args[2] || window.location.pathname;
  return originalReplaceState.apply(this, args);
};

// 2. 监控认证状态变化
let authCheckCount = 0;
const monitorAuth = () => {
  authCheckCount++;
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log(`🔐 认证状态检查 #${authCheckCount}:`, {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    hasUser: !!user,
    userInfo: user ? JSON.parse(user) : null,
    timestamp: new Date().toISOString()
  });
};

// 初始认证状态
monitorAuth();

// 监听 localStorage 变化
window.addEventListener('storage', (event) => {
  if (event.key === 'token' || event.key === 'user') {
    console.log('💾 localStorage变化:', {
      key: event.key,
      oldValue: event.oldValue,
      newValue: event.newValue,
      timestamp: new Date().toISOString()
    });
    monitorAuth();
  }
});

// 3. 监控React组件状态（如果可访问）
let reactCheckInterval;
const monitorReactState = () => {
  try {
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
      console.log('⚛️ React状态:', {
        hasReactRoot: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log('⚛️ React状态检查失败:', error.message);
  }
};

// 4. 监控网络请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('/api/')) {
    console.log('🌐 API请求:', {
      url: url,
      method: args[1]?.method || 'GET',
      timestamp: new Date().toISOString()
    });
    
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('🌐 API响应:', {
          url: url,
          status: response.status,
          ok: response.ok,
          timestamp: new Date().toISOString()
        });
        return response;
      })
      .catch(error => {
        console.log('🌐 API错误:', {
          url: url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  }
  return originalFetch.apply(this, args);
};

// 5. 监控定时器和异步操作
const originalSetTimeout = window.setTimeout;
const originalSetInterval = window.setInterval;

window.setTimeout = function(callback, delay, ...args) {
  const wrappedCallback = function() {
    console.log('⏰ setTimeout执行:', {
      delay: delay,
      timestamp: new Date().toISOString(),
      stack: new Error().stack.split('\n').slice(1, 4)
    });
    return callback.apply(this, arguments);
  };
  return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
};

window.setInterval = function(callback, delay, ...args) {
  const wrappedCallback = function() {
    console.log('⏰ setInterval执行:', {
      delay: delay,
      timestamp: new Date().toISOString()
    });
    return callback.apply(this, arguments);
  };
  return originalSetInterval.call(this, wrappedCallback, delay, ...args);
};

// 6. 监控页面可见性变化
document.addEventListener('visibilitychange', () => {
  console.log('👁️ 页面可见性变化:', {
    hidden: document.hidden,
    visibilityState: document.visibilityState,
    timestamp: new Date().toISOString()
  });
});

// 7. 监控焦点变化
window.addEventListener('focus', () => {
  console.log('🎯 窗口获得焦点:', {
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('blur', () => {
  console.log('🎯 窗口失去焦点:', {
    timestamp: new Date().toISOString()
  });
});

// 8. 定期检查状态
setInterval(() => {
  const currentLocation = window.location.pathname;
  if (currentLocation !== currentPath) {
    console.log('🔍 路径变化检测:', {
      oldPath: currentPath,
      newPath: currentLocation,
      timestamp: new Date().toISOString()
    });
    currentPath = currentLocation;
  }
  monitorAuth();
}, 1000);

console.log('=== 调试监控已启动，请执行导航操作 ===');
console.log('提示：点击健康记录追踪或社区功能，观察控制台输出');

// 9. 提供手动触发函数
window.debugNavigation = {
  getCurrentState: () => {
    return {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      token: !!localStorage.getItem('token'),
      user: !!localStorage.getItem('user'),
      timestamp: new Date().toISOString()
    };
  },
  clearLogs: () => {
    console.clear();
    console.log('=== 日志已清除，继续监控 ===');
  }
};

console.log('可用调试函数:', Object.keys(window.debugNavigation));