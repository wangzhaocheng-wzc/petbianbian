import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import FileUpload from './FileUpload';

interface PoopAnalysisUploadProps {
  petId: string;
  onAnalysisComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface AnalysisResult {
  id: string;
  imageUrl: string;
  analysis: {
    shape: string;
    healthStatus: 'healthy' | 'warning' | 'concerning';
    confidence: number;
    details: string;
    recommendations: string[];
  };
  timestamp: Date;
}

const PoopAnalysisUpload: React.FC<PoopAnalysisUploadProps> = ({
  petId,
  onAnalysisComplete,
  onError
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setError('');
    setAnalysisResult(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('请先选择要分析的图片');
      return;
    }

    if (!petId) {
      setError('请先选择宠物');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFiles[0]);
      formData.append('petId', petId);
      if (notes) formData.append('notes', notes);
      if (symptoms) formData.append('symptoms', symptoms);

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/analysis/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data);
        onAnalysisComplete?.(data.data);
        
        // 清空表单
        setSelectedFiles([]);
        setNotes('');
        setSymptoms('');
      } else {
        throw new Error(data.message || '分析失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败，请稍后重试';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'concerning':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '健康';
      case 'warning':
        return '需要注意';
      case 'concerning':
        return '需要关注';
      default:
        return '未知';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">便便健康分析</h2>
        <p className="text-gray-600">
          上传宠物便便照片，我们将使用AI技术为您分析健康状况
        </p>
      </div>

      {/* 文件上传区域 */}
      <div className="mb-6">
        <FileUpload
          onFileSelect={handleFileSelect}
          maxFiles={1}
          multiple={false}
          accept={{
            'image/*': ['.jpeg', '.jpg', '.png', '.webp']
          }}
          uploadProgress={isUploading ? uploadProgress : undefined}
          error={error}
          success={!!analysisResult}
          disabled={isUploading}
        />
      </div>

      {/* 附加信息输入 */}
      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            备注信息 (可选)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="记录宠物当天的状态、饮食等信息..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
            disabled={isUploading}
          />
        </div>

        <div>
          <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-2">
            相关症状 (可选)
          </label>
          <input
            type="text"
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="如：食欲不振、精神萎靡等，用逗号分隔"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* 上传按钮 */}
      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="w-full flex items-center justify-center px-4 py-3 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
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

      {/* 分析结果 */}
      {analysisResult && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">分析完成</h3>
          </div>

          <div className="space-y-4">
            {/* 健康状态 */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">健康状态:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(analysisResult.analysis.healthStatus)}`}>
                {getHealthStatusText(analysisResult.analysis.healthStatus)}
              </span>
              <span className="text-sm text-gray-500">
                置信度: {analysisResult.analysis.confidence}%
              </span>
            </div>

            {/* 详细分析 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">详细分析:</h4>
              <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                {analysisResult.analysis.details}
              </p>
            </div>

            {/* 建议 */}
            {analysisResult.analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">健康建议:</h4>
                <ul className="space-y-1">
                  {analysisResult.analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 警告信息 */}
            {analysisResult.analysis.healthStatus === 'concerning' && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">建议就医</p>
                  <p className="text-sm text-red-700">
                    检测到异常情况，建议尽快咨询兽医进行专业诊断。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PoopAnalysisUpload;