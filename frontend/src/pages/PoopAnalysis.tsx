import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface AnalysisResult {
  shape: string
  healthStatus: 'healthy' | 'warning' | 'concerning'
  description: string
  recommendations: string[]
  confidence: number
}

export default function PoopAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false
  })

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    
    // 模拟API调用
    setTimeout(() => {
      setResult({
        shape: '类型4 - 香肠状，表面光滑',
        healthStatus: 'healthy',
        description: '这是健康的便便形状，表明宠物消化系统运作良好。',
        recommendations: [
          '继续保持当前的饮食习惯',
          '确保充足的水分摄入',
          '定期运动有助于消化健康'
        ],
        confidence: 92
      })
      setIsAnalyzing(false)
    }, 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />
      case 'concerning':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'concerning':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">便便健康分析</h1>
        <p className="text-gray-600">上传宠物便便照片，获得专业的健康分析</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input {...getInputProps()} />
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-xs max-h-64 mx-auto rounded-lg"
              />
              <p className="text-sm text-gray-600">点击或拖拽更换图片</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? '放下图片开始分析' : '点击或拖拽上传图片'}
                </p>
                <p className="text-sm text-gray-600">
                  支持 JPG、PNG、WebP 格式，最大 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mt-4 text-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  开始分析
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {result && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">分析结果</h2>
          
          <div className={`border rounded-lg p-4 mb-4 ${getStatusColor(result.healthStatus)}`}>
            <div className="flex items-center mb-2">
              {getStatusIcon(result.healthStatus)}
              <span className="ml-2 font-medium">
                {result.healthStatus === 'healthy' && '健康状况良好'}
                {result.healthStatus === 'warning' && '需要注意'}
                {result.healthStatus === 'concerning' && '建议就医'}
              </span>
              <span className="ml-auto text-sm">
                置信度: {result.confidence}%
              </span>
            </div>
            <p className="text-sm">{result.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">便便类型</h3>
              <p className="text-gray-600">{result.shape}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">建议</h3>
              <ul className="text-gray-600 space-y-1">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <button className="w-full py-2 px-4 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50">
              保存到记录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}