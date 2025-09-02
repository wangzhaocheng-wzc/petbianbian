import { useState, useEffect } from 'react'

interface MobileDetection {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  orientation: 'portrait' | 'landscape'
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function useMobile(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'landscape',
    screenSize: 'lg'
  })

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // 检测设备类型
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024
      
      // 检测触摸设备
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // 检测屏幕方向
      const orientation = height > width ? 'portrait' : 'landscape'
      
      // 检测屏幕尺寸
      let screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'lg'
      if (width < 475) screenSize = 'xs'
      else if (width < 640) screenSize = 'sm'
      else if (width < 768) screenSize = 'md'
      else if (width < 1024) screenSize = 'lg'
      else screenSize = 'xl'
      
      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
        screenSize
      })
    }

    // 初始检测
    updateDetection()

    // 监听窗口大小变化
    window.addEventListener('resize', updateDetection)
    window.addEventListener('orientationchange', updateDetection)

    return () => {
      window.removeEventListener('resize', updateDetection)
      window.removeEventListener('orientationchange', updateDetection)
    }
  }, [])

  return detection
}

// 移动端手势支持
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  useEffect(() => {
    let startX = 0
    let startY = 0
    let endX = 0
    let endY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      endX = e.changedTouches[0].clientX
      endY = e.changedTouches[0].clientY
      
      const deltaX = endX - startX
      const deltaY = endY - startY
      
      // 判断是否为有效滑动
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        // 水平滑动
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            onSwipeRight?.()
          } else {
            onSwipeLeft?.()
          }
        }
        // 垂直滑动
        else {
          if (deltaY > 0) {
            onSwipeDown?.()
          } else {
            onSwipeUp?.()
          }
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])
}

// 移动端相机访问
export function useMobileCamera() {
  const [isSupported, setIsSupported] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    // 检测相机支持
    setIsSupported(
      'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    )
  }, [])

  const startCamera = async (facingMode: 'user' | 'environment' = 'environment') => {
    if (!isSupported) {
      throw new Error('设备不支持相机功能')
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      setStream(mediaStream)
      return mediaStream
    } catch (error) {
      console.error('启动相机失败:', error)
      throw new Error('无法访问相机，请检查权限设置')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = (videoElement: HTMLVideoElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (!context) {
          reject(new Error('无法创建画布'))
          return
        }

        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
        
        context.drawImage(videoElement, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('拍照失败'))
          }
        }, 'image/jpeg', 0.9)
      } catch (error) {
        reject(error)
      }
    })
  }

  return {
    isSupported,
    stream,
    startCamera,
    stopCamera,
    capturePhoto
  }
}