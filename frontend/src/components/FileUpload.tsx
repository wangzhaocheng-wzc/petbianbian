import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';
import MobileCamera from './mobile/MobileCamera';
import TouchButton from './common/TouchButton';
import { useI18n } from '../i18n/I18nProvider';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  preview?: boolean;
  uploadProgress?: number;
  error?: string;
  success?: boolean;
}

interface FileWithPreview extends File {
  preview?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
  },
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  disabled = false,
  className = '',
  preview = true,
  uploadProgress,
  error,
  success = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const { isMobile } = useMobile();
  const { t, language } = useI18n();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('FileUpload: 文件被选择', acceptedFiles);
    
    const filesWithPreview = acceptedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview;
      if (preview && file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
        console.log('FileUpload: 生成预览URL', fileWithPreview.preview, 'for file:', file.name);
      }
      return fileWithPreview;
    });

    // 使用 setTimeout 避免在渲染期间更新状态
    setTimeout(() => {
      setSelectedFiles(prev => {
        const newFiles = multiple ? [...prev, ...filesWithPreview] : filesWithPreview;
        console.log('FileUpload: 更新选中文件', newFiles);
        onFileSelect(newFiles);
        return newFiles;
      });
    }, 0);
  }, [onFileSelect, multiple, preview]);

  const handleCameraCapture = (file: File) => {
    console.log('FileUpload: 相机捕获文件', file);
    
    const fileWithPreview = file as FileWithPreview;
    if (preview && file.type.startsWith('image/')) {
      fileWithPreview.preview = URL.createObjectURL(file);
      console.log('FileUpload: 生成相机预览URL', fileWithPreview.preview);
    }

    // 使用 setTimeout 避免在渲染期间更新状态
    setTimeout(() => {
      setSelectedFiles(prev => {
        const newFiles = multiple ? [...prev, fileWithPreview] : [fileWithPreview];
        console.log('FileUpload: 更新相机文件', newFiles);
        onFileSelect(newFiles);
        return newFiles;
      });
      setShowCamera(false);
    }, 0);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // 清理预览URL
      if (prev[index].preview) {
        URL.revokeObjectURL(prev[index].preview!);
      }
      onFileRemove?.(index);
      return newFiles;
    });
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple,
    disabled
  });

  // 清理预览URL
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 移动端相机按钮 */}
      {isMobile && accept['image/*'] && (
        <div className="mb-4">
      <TouchButton
        onClick={() => setShowCamera(true)}
        variant="outline"
        fullWidth
        icon={Camera}
        disabled={disabled}
        className="border-2 border-dashed border-gray-300 hover:border-orange-400 bg-white"
      >
        {t('fileUpload.useCameraButton')}
      </TouchButton>
    </div>
  )}

      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors min-h-[120px] sm:min-h-[140px] touch:min-h-[140px]
          ${isDragActive 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50 active:bg-gray-100'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-400 bg-red-50' : ''}
          ${success ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* 上传图标和文字 */}
        <div className="flex flex-col items-center space-y-2 justify-center h-full">
          {uploadProgress !== undefined ? (
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{t('fileUpload.uploading')}</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              {error ? (
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400" />
              ) : success ? (
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-400" />
              ) : (
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
              )}
              
              <div className="px-2">
                <p className="text-base sm:text-lg font-medium text-gray-700">
                  {isDragActive 
                    ? t('fileUpload.dropHere') 
                    : isMobile 
                      ? t('fileUpload.clickToSelect') 
                      : t('fileUpload.dragOrClick')
                  }
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {t('fileUpload.supportedFormatsAndMax', { max: formatFileSize(maxSize) })}
                  {multiple && ` ${t('fileUpload.maxFiles', { count: maxFiles })}`}
                </p>
                {isMobile && accept['image/*'] && (
                  <p className="text-xs text-orange-600 mt-1">
                    {t('fileUpload.useCameraTip')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 文件拒绝错误 */}
        {fileRejections.length > 0 && (
          <div className="mt-2 text-sm text-red-600">
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name}>
                {file.name}: {errors.map(e => e.message).join(', ')}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 文件预览列表 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">{t('fileUpload.selectedFiles')}:</h4>
          <div className="grid grid-cols-1 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {/* 图片预览 */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded flex-shrink-0"
                    onLoad={() => console.log('FileUpload: 图片加载成功', file.preview)}
                    onError={(e) => console.error('FileUpload: 图片加载失败', file.preview, e)}
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* 删除按钮 */}
                <TouchButton
                  onClick={() => removeFile(index)}
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-500 active:text-red-600 min-h-[44px] min-w-[44px]"
                  icon={X}
                >
                </TouchButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 移动端相机组件 */}
      <MobileCamera
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    </div>
  );
};

export default FileUpload;