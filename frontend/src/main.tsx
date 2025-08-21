import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// 性能监控和优化工具
import { performanceMonitor } from './utils/performance'
import { swManager } from './utils/serviceWorker'
import { preconnectDomain } from './utils/resourcePreloader'

// 预连接到API域名
preconnectDomain(window.location.origin)

// 初始化Service Worker
if (import.meta.env.PROD) {
  swManager.initialize('/sw.js').catch(console.error)
}

// 预缓存关键资源
const criticalResources = [
  '/api/health',
  // 可以添加其他关键API端点
]

if (import.meta.env.PROD) {
  swManager.precacheResources(criticalResources)
}

// 性能监控
if (import.meta.env.PROD) {
  // 页面加载完成后发送性能数据
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.sendMetrics('/api/analytics/performance').catch(console.error)
    }, 2000) // 延迟2秒确保所有资源加载完成
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)