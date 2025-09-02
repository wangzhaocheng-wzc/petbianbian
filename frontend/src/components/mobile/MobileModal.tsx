import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useMobile } from '../../hooks/useMobile'
import TouchButton from '../common/TouchButton'

interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  className?: string
}

export default function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}: MobileModalProps) {
  const { isMobile } = useMobile()

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // 移动端添加安全区域处理
      if (isMobile) {
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
        document.body.style.top = `-${window.scrollY}px`
      }
    } else {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      
      if (isMobile && scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [isOpen, isMobile])

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getSizeClasses = () => {
    if (isMobile) {
      return size === 'full' 
        ? 'inset-0' 
        : 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-xl'
    }

    switch (size) {
      case 'sm':
        return 'max-w-md'
      case 'md':
        return 'max-w-lg'
      case 'lg':
        return 'max-w-2xl'
      case 'full':
        return 'max-w-full mx-4'
      default:
        return 'max-w-lg'
    }
  }

  const getAnimationClasses = () => {
    if (isMobile && size !== 'full') {
      return 'animate-slide-up'
    }
    return 'animate-fade-in'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* 模态框容器 */}
      <div className={`
        flex items-center justify-center min-h-full p-4
        ${isMobile ? 'items-end p-0' : ''}
      `}>
        <div className={`
          relative bg-white shadow-xl transform transition-all
          ${getSizeClasses()}
          ${getAnimationClasses()}
          ${isMobile && size !== 'full' ? '' : 'rounded-lg'}
          ${className}
        `}>
          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className={`
              flex items-center justify-between p-4 border-b border-gray-200
              ${isMobile ? 'pt-safe-top' : ''}
            `}>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                  {title}
                </h3>
              )}
              
              {showCloseButton && (
                <TouchButton
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  icon={X}
                  className="text-gray-400 hover:text-gray-600"
                >
                </TouchButton>
              )}
            </div>
          )}

          {/* 内容区域 */}
          <div className={`
            ${isMobile ? 'max-h-[calc(90vh-4rem)] overflow-y-auto' : ''}
            ${size === 'full' && isMobile ? 'pb-safe-bottom' : ''}
          `}>
            {children}
          </div>

          {/* 移动端拖拽指示器 */}
          {isMobile && size !== 'full' && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
              <div className="w-8 h-1 bg-gray-300 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}