// Mobile device utilities and helpers

export interface DeviceCapabilities {
  hasCamera: boolean
  hasGeolocation: boolean
  hasVibration: boolean
  hasShare: boolean
  hasClipboard: boolean
  hasNotifications: boolean
  hasOrientation: boolean
  hasTouch: boolean
}

export function getDeviceCapabilities(): DeviceCapabilities {
  return {
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    hasGeolocation: 'geolocation' in navigator,
    hasVibration: 'vibrate' in navigator,
    hasShare: 'share' in navigator,
    hasClipboard: 'clipboard' in navigator,
    hasNotifications: 'Notification' in window,
    hasOrientation: 'orientation' in screen,
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent)
}

export function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    availableWidth: window.screen.availWidth,
    availableHeight: window.screen.availHeight
  }
}

export function getOrientation(): 'portrait' | 'landscape' {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
}

// 触觉反馈
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    }
    navigator.vibrate(patterns[type])
  }
}

// 防止页面缩放
export function preventZoom() {
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })

  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })
}

// 安全区域检测
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0')
  }
}

// 网络状态检测
export function getNetworkInfo() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (!connection) {
    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    }
  }

  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false
  }
}

// 电池状态检测
export async function getBatteryInfo() {
  try {
    const battery = await (navigator as any).getBattery?.()
    if (battery) {
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      }
    }
  } catch (error) {
    console.warn('Battery API not supported')
  }
  
  return null
}

// 设备内存信息
export function getMemoryInfo() {
  const memory = (performance as any).memory
  if (memory) {
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    }
  }
  return null
}

// 移动端优化的图片加载
export function optimizeImageForMobile(src: string, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
} = {}): string {
  const { width, height, quality = 80, format = 'webp' } = options
  
  // 如果是外部URL，直接返回
  if (src.startsWith('http')) {
    return src
  }
  
  // 构建优化参数
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  params.set('q', quality.toString())
  params.set('f', format)
  
  return `${src}?${params.toString()}`
}

// 移动端友好的文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 移动端优化的日期格式化
export function formatDateForMobile(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

// 移动端滚动到顶部
export function scrollToTop(smooth = true) {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

// 移动端滚动到元素
export function scrollToElement(element: HTMLElement, offset = 0) {
  const elementPosition = element.offsetTop - offset
  window.scrollTo({
    top: elementPosition,
    behavior: 'smooth'
  })
}

// 检测是否支持PWA安装
export function canInstallPWA(): boolean {
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window
}

// 移动端复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

// 移动端分享
export async function shareContent(data: {
  title?: string
  text?: string
  url?: string
}): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share(data)
      return true
    } else {
      // 降级到复制链接
      const shareText = `${data.title || ''}\n${data.text || ''}\n${data.url || ''}`
      return await copyToClipboard(shareText.trim())
    }
  } catch (error) {
    console.error('分享失败:', error)
    return false
  }
}