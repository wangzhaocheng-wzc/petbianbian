import React, { useState } from 'react';
import { X, Image as ImageIcon, Loader } from 'lucide-react';
import FileUpload from './FileUpload';

interface CommunityImageUploadProps {
  onImagesChange?: (imageUrls: string[]) => void;
  onError?: (error: string) => void;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
  initialImages?: string[];
}

interface UploadedImage {
  url: string;
  filename: string;
  isUploading?: boolean;
}

const CommunityImageUpload: React.FC<CommunityImageUploadProps> = ({
  onImagesChange,
  onError,
  maxImages = 5,
  disabled = false,
  className = '',
  initialImages = []
}) => {
  const [images, setImages] = useState<UploadedImage[]>(
    initialImages.map(url => ({ url, filename: '' }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      const errorMsg = `最多只能上传${maxImages}张图片`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsUploading(true);
    setError('');

    // 为每个文件创建临时条目
    const tempImages = files.map(file => ({
      url: URL.createObjectURL(file),
      filename: file.name,
      isUploading: true
    }));

    setImages(prev => [...prev, ...tempImages]);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/community', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // 替换临时图片为实际上传的图片
        setImages(prev => {
          const newImages = [...prev];
          // 移除临时图片
          const nonTempImages = newImages.filter(img => !img.isUploading);
          // 添加上传成功的图片
          const uploadedImages = data.data.files.map((file: any) => ({
            url: file.url,
            filename: file.filename
          }));
          
          const finalImages = [...nonTempImages, ...uploadedImages];
          onImagesChange?.(finalImages.map(img => img.url));
          return finalImages;
        });

        // 清理临时URL
        tempImages.forEach(img => {
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
        });
      } else {
        throw new Error(data.message || '图片上传失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败，请稍后重试';
      setError(errorMessage);
      onError?.(errorMessage);

      // 移除失败的临时图片
      setImages(prev => prev.filter(img => !img.isUploading));
      
      // 清理临时URL
      tempImages.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      onImagesChange?.(newImages.map(img => img.url));
      
      // 清理URL
      const removedImage = prev[index];
      if (removedImage.url.startsWith('blob:')) {
        URL.revokeObjectURL(removedImage.url);
      }
      
      return newImages;
    });
    setError('');
  };

  // 清理所有预览URL
  React.useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, []);

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className={`w-full ${className}`}>
      {/* 图片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
        {/* 已上传的图片 */}
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square group">
            <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
              <img
                src={image.url}
                alt={`上传的图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* 上传中遮罩 */}
              {image.isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Loader className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* 删除按钮 */}
            {!disabled && !image.isUploading && (
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* 添加图片按钮 */}
        {canAddMore && (
          <div className="aspect-square">
            <FileUpload
              onFileSelect={handleFileSelect}
              maxFiles={maxImages - images.length}
              multiple={true}
              accept={{
                'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
              }}
              disabled={disabled || isUploading}
              preview={false}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          已上传 {images.length} / {maxImages} 张图片
        </span>
        
        {isUploading && (
          <div className="flex items-center space-x-2">
            <Loader className="w-4 h-4 animate-spin" />
            <span>上传中...</span>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 使用提示 */}
      {images.length === 0 && !error && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center space-x-3">
            <ImageIcon className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">添加图片</p>
              <p className="text-sm text-gray-500">
                支持JPG、PNG、WebP、GIF格式，最多{maxImages}张图片
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityImageUpload;