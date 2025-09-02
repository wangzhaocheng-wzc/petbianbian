import React, { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download, Share2 } from 'lucide-react'
import { useSwipeGesture } from '../../hooks/useMobile'
import TouchButton from '../common/TouchButton'

interface MobileImageViewerProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
  initialIndex?: number
  title?: string
}

export default function MobileImageViewer({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title
}: MobileImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 重置图片状态
  const resetImageState = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  // 切换到下一张图片
  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1)
      resetImageState()
    }
  }

  // 切换到上一张图片
  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      resetImageState()
    }
  }

  // 手势支持
  useSwipeGesture(
    nextImage,  // 左滑下一张
    prevImage,  // 右滑上一张
    undefined,  // 上滑
    undefined   // 下滑
  )

  // 缩放控制
  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5))
  }

  // 旋转控制
  const rotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  // 下载图片
  const downloadImage = async () => {
    try {
      const response = await fetch(images[currentIndex])
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `image-${currentIndex + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  // 分享图片
  const shareImage = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title || '图片分享',
          url: images[currentIndex]
        })
      } else {
        await navigator.clipboard.writeText(images[currentIndex])
        alert('图片链接已复制到剪贴板')
      }
    } catch (error) {
      console.error('分享失败:', error)
    }
  }

  // 双击缩放
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      resetImageState()
    }
  }

  // 触摸拖拽
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      setPosition(prev => ({
        startX: touch.clientX - prev.x,
        startY: touch.clientY - prev.y,
        x: prev.x,
        y: prev.y
      } as any))
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault()
      const touch = e.touches[0]
      setPosition(prev => ({
        ...prev,
        x: touch.clientX - (prev as any).startX,
        y: touch.clientY - (prev as any).startY
      }))
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // 控制栏自动隐藏
  useEffect(() => {
    if (!showControls) return

    const timer = setTimeout(() => {
      setShowControls(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [showControls, currentIndex])

  // 点击显示控制栏
  const toggleControls = () => {
    setShowControls(prev => !prev)
  }

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          prevImage()
          break
        case 'ArrowRight':
          nextImage()
          break
        case '+':
        case '=':
          zoomIn()
          break
        case '-':
          zoomOut()
          break
        case 'r':
        case 'R':
          rotate()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  // 重置状态当索引改变时
  useEffect(() => {
    setCurrentIndex(initialIndex)
    resetImageState()
  }, [initialIndex])

  if (!isOpen || images.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 顶部控制栏 */}
      <div className={`
        absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4 pt-safe-top
        transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <TouchButton
              onClick={onClose}
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20"
              icon={X}
            >
            </TouchButton>
            
            {title && (
              <h3 className="text-lg font-medium truncate">{title}</h3>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      </div>

      {/* 图片显示区域 */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
        onClick={toggleControls}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`图片 ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          draggable={false}
        />
      </div>

      {/* 底部控制栏 */}
      <div className={`
        absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black to-transparent p-4 pb-safe-bottom
        transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="flex items-center justify-center space-x-4">
          {/* 缩放控制 */}
          <TouchButton
            onClick={zoomOut}
            variant="ghost"
            className="text-white hover:bg-white hover:bg-opacity-20"
            icon={ZoomOut}
            disabled={scale <= 0.5}
          >
          </TouchButton>
          
          <TouchButton
            onClick={zoomIn}
            variant="ghost"
            className="text-white hover:bg-white hover:bg-opacity-20"
            icon={ZoomIn}
            disabled={scale >= 5}
          >
          </TouchButton>

          {/* 旋转 */}
          <TouchButton
            onClick={rotate}
            variant="ghost"
            className="text-white hover:bg-white hover:bg-opacity-20"
            icon={RotateCw}
          >
          </TouchButton>

          {/* 下载 */}
          <TouchButton
            onClick={downloadImage}
            variant="ghost"
            className="text-white hover:bg-white hover:bg-opacity-20"
            icon={Download}
          >
          </TouchButton>

          {/* 分享 */}
          <TouchButton
            onClick={shareImage}
            variant="ghost"
            className="text-white hover:bg-white hover:bg-opacity-20"
            icon={Share2}
          >
          </TouchButton>
        </div>

        {/* 图片导航指示器 */}
        {images.length > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-4">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  resetImageState()
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 左右导航按钮 */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-opacity"
            >
              ‹
            </button>
          )}
          
          {currentIndex < images.length - 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-opacity"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  )
}