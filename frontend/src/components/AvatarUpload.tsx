import React, { useState } from 'react';
import { Camera, User, Loader, X } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange?: (avatarUrl: string) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  onError,
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = '只支持JPG、PNG、WebP格式的图片';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = '图片大小不能超过5MB';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // 创建预览
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setError('');

    // 上传文件
    await uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        onAvatarChange?.(data.data.url);
      } else {
        throw new Error(data.message || '头像上传失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败，请稍后重试';
      setError(errorMessage);
      onError?.(errorMessage);
      
      // 清除预览
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError('');
  };

  // 清理预览URL
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 头像显示区域 */}
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200`}>
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt="头像"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <User className={`${iconSizes[size]} text-gray-400`} />
          </div>
        )}

        {/* 上传中遮罩 */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader className={`${iconSizes[size]} text-white animate-spin`} />
          </div>
        )}

        {/* 上传按钮 */}
        {!disabled && (
          <label className="absolute inset-0 cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <Camera className={`${iconSizes[size]} text-white opacity-0 hover:opacity-100 transition-opacity duration-200`} />
            </div>
          </label>
        )}
      </div>

      {/* 清除预览按钮 */}
      {previewUrl && !isUploading && (
        <button
          onClick={clearPreview}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700 whitespace-nowrap z-10">
          {error}
        </div>
      )}

      {/* 上传提示 */}
      {!disabled && !isUploading && (
        <div className="absolute top-full left-0 mt-2 text-xs text-gray-500 whitespace-nowrap">
          点击更换头像
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;