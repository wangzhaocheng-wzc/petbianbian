import { useRef, useEffect, useState } from 'react'
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react'
import { useMobileCamera } from '../../hooks/useMobile'
import TouchButton from '../common/TouchButton'

interface MobileCameraProps {
  onCapture: (file: File) => void
  onClose: () => void
  isOpen: boolean
}

export default function MobileCamera({ onCapture, onClose, isOpen }: MobileCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isSupported, stream, startCamera, stopCamera, capturePhoto } = useMobileCamera()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)

  // 启动相机
  useEffect(() => {
    if (isOpen && isSupported) {
      initCamera()
    }
    
    return () => {
      if (stream) {
        stopCamera()
      }
    }
  }, [isOpen, facingMode])

  // 设置视频流
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const initCamera = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      await startCamera(facingMode)
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动相机失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCapture = async () => {
    if (!videoRef.current) return
    
    try {
      setIsLoading(true)
      const blob = await capturePhoto(videoRef.current)
      
      // 创建预览图片
      const imageUrl = URL.createObjectURL(blob)
      setCapturedImage(imageUrl)
      setCapturedBlob(blob)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '拍照失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], `photo-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      })
      onCapture(file)
      handleClose()
    }
  }

  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage)
    }
    setCapturedImage('')
    setCapturedBlob(null)
  }

  const handleClose = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage)
    }
    setCapturedImage('')
    setCapturedBlob(null)
    stopCamera()
    onClose()
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  if (!isOpen) return null

  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold">不支持相机</h3>
          </div>
          <p className="text-gray-600 mb-4">
            您的设备不支持相机功能，请使用文件上传方式。
          </p>
          <TouchButton onClick={handleClose} fullWidth>
            确定
          </TouchButton>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 text-white pt-safe-top">
        <TouchButton
          onClick={handleClose}
          variant="ghost"
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          <X className="w-6 h-6" />
        </TouchButton>
        
        <h2 className="text-lg font-semibold">拍照</h2>
        
        <TouchButton
          onClick={toggleCamera}
          variant="ghost"
          className="text-white hover:bg-white hover:bg-opacity-20"
          disabled={isLoading}
        >
          <RotateCcw className="w-6 h-6" />
        </TouchButton>
      </div>

      {/* 相机预览区域 */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white p-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <p className="text-lg mb-2">相机启动失败</p>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <TouchButton onClick={initCamera} variant="primary">
                重试
              </TouchButton>
            </div>
          </div>
        ) : capturedImage ? (
          <div className="h-full flex items-center justify-center bg-black">
            <img
              src={capturedImage}
              alt="拍摄的照片"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* 拍照指导线 */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white border-opacity-30 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white"></div>
              </div>
            </div>
            
            {/* 加载指示器 */}
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p>启动相机中...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部控制栏 */}
      <div className="bg-black bg-opacity-50 p-4 pb-safe-bottom">
        {capturedImage ? (
          <div className="flex items-center justify-center space-x-4">
            <TouchButton
              onClick={handleRetake}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
              size="lg"
            >
              重拍
            </TouchButton>
            <TouchButton
              onClick={handleConfirm}
              variant="primary"
              size="lg"
              icon={Check}
            >
              使用照片
            </TouchButton>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <TouchButton
              onClick={handleCapture}
              disabled={isLoading || !stream}
              className="w-20 h-20 bg-white bg-opacity-20 hover:bg-opacity-30 border-4 border-white rounded-full flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-black" />
              </div>
            </TouchButton>
          </div>
        )}
      </div>

      {/* 隐藏的canvas用于拍照 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}