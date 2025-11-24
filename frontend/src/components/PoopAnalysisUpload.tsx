import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import FileUpload from './FileUpload';
import { MobileForm, MobileTextarea, MobileInput } from './mobile/MobileForm';
import TouchButton from './common/TouchButton';
import { AnalysisService } from '../services/analysisService';
import { PoopRecord } from '../../../shared/types';
import { useI18n } from '../i18n/I18nProvider';

interface PoopAnalysisUploadProps {
  petId: string;
  onAnalysisComplete?: (result: PoopRecord) => void;
  onError?: (error: string) => void;
}


const PoopAnalysisUpload: React.FC<PoopAnalysisUploadProps> = ({
  petId,
  onAnalysisComplete,
  onError
}) => {
  const { t, language } = useI18n();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<PoopRecord | null>(null);
  const [error, setError] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [symptoms, setSymptoms] = useState('');


  const handleFileSelect = (files: File[]) => {
    // 使用 setTimeout 避免在渲染期间更新状态
    setTimeout(() => {
      setSelectedFiles(files);
      setError('');
      setAnalysisResult(null);
    }, 0);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError(t('analysis.upload.error.noFile'));
      return;
    }

    if (!petId) {
      setError(t('analysis.upload.error.noPet'));
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

      // 使用 AnalysisService 进行上传
      const result = await AnalysisService.uploadForAnalysis(
        selectedFiles[0],
        petId,
        notes,
        symptoms
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.data) {
        setAnalysisResult(result.data);
        onAnalysisComplete?.(result.data);
        
        // 清空表单
        setSelectedFiles([]);
        setNotes('');
        setSymptoms('');
      } else {
        throw new Error(result.message || t('analysis.upload.error.analysisFailed'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('analysis.upload.error.uploadFailed');
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
        return t('status.healthy');
      case 'warning':
        return t('status.warning');
      case 'concerning':
        return t('status.concerning');
      default:
        return t('status.unknown');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('analysis.header.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">
          {t('analysis.upload.subtitle')}
        </p>
      </div>

      {/* 文件上传区域 */}
      <div className="mb-4 sm:mb-6">
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
      <MobileForm className="mb-4 sm:mb-6">
        <MobileTextarea
          label={t('analysis.upload.notesLabel')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('analysis.upload.notesPlaceholder')}
          disabled={isUploading}
          helperText={t('analysis.upload.notesHelper')}
        />

        <MobileInput
          label={t('analysis.upload.symptomsLabel')}
          type="text"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder={t('analysis.upload.symptomsPlaceholder')}
          disabled={isUploading}
          helperText={t('analysis.upload.symptomsHelper')}
        />
      </MobileForm>

      {/* 上传按钮 */}
      <div className="mb-4 sm:mb-6">
        <TouchButton
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          fullWidth
          size="lg"
          loading={isUploading}
          icon={isUploading ? Loader : Camera}
        >
          {isUploading ? t('analysis.upload.uploading') : t('analysis.upload.submit')}
        </TouchButton>
      </div>

      {/* 分析结果 */}
      {analysisResult && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('analysis.results.completed')}</h3>
          </div>

          <div className="space-y-4">
            {/* 健康状态 */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">{t('analysis.detail.healthStatusLabel')}:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(analysisResult.analysis.healthStatus)}`}>
                {getHealthStatusText(analysisResult.analysis.healthStatus)}
              </span>
              <span className="text-sm text-gray-500">
                {t('analysis.results.confidence')}: {analysisResult.analysis.confidence}%
              </span>
            </div>

            {/* 详细分析 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('analysis.upload.result.detailsLabel')}:</h4>
              <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                {analysisResult.analysis.details}
              </p>
            </div>

            {/* 建议 */}
            {analysisResult.analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('analysisResult.healthAdviceTitle')}:</h4>
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
                  <p className="text-sm font-medium text-red-800">{t('healthStatus.concerning.title')}</p>
                  <p className="text-sm text-red-700">
                    {t('analysis.upload.warningContent')}
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