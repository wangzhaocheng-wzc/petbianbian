import { useState, useRef, useEffect, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
  threshold?: number
  className?: string
}

export default function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = ''
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return
    
    // 只在页面顶部时启用下拉刷新
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || isRefreshing || startY === 0) return
    
    const currentY = e.touches[0].clientY
    const distance = currentY - startY
    
    // 只处理向下拉的手势
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault()
      const adjustedDistance = Math.min(distance * 0.5, threshold * 1.5)
      setPullDistance(adjustedDistance)
      setIsPulling(adjustedDistance > threshold)
    }
  }

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing) return
    
    if (isPulling && pullDistance > threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('刷新失败:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
    
    // 重置状态
    setStartY(0)
    setPullDistance(0)
    setIsPulling(false)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, isRefreshing, startY, pullDistance, isPulling, threshold])

  const getRefreshIndicatorStyle = () => {
    const progress = Math.min(pullDistance / threshold, 1)
    const opacity = Math.min(progress, 1)
    const scale = Math.min(0.5 + progress * 0.5, 1)
    const rotation = progress * 180
    
    return {
      opacity,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      transition: isRefreshing ? 'transform 0.2s ease-out' : 'none'
    }
  }

  const getContainerStyle = () => {
    if (isRefreshing) {
      return {
        transform: `translateY(${threshold}px)`,
        transition: 'transform 0.3s ease-out'
      }
    }
    
    if (pullDistance > 0) {
      return {
        transform: `translateY(${pullDistance}px)`,
        transition: 'none'
      }
    }
    
    return {
      transform: 'translateY(0)',
      transition: 'transform 0.3s ease-out'
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 刷新指示器 */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg z-10"
        style={{
          ...getRefreshIndicatorStyle(),
          marginTop: `-${threshold / 2}px`
        }}
      >
        <RefreshCw 
          className={`w-6 h-6 text-orange-600 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </div>
      
      {/* 刷新提示文字 */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full text-center z-10"
          style={{ marginTop: `-${threshold / 4}px` }}
        >
          <p className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
            {isRefreshing ? '刷新中...' : isPulling ? '松开刷新' : '下拉刷新'}
          </p>
        </div>
      )}
      
      {/* 内容区域 */}
      <div style={getContainerStyle()}>
        {children}
      </div>
    </div>
  )
}