import React, { useState, useRef, useEffect } from 'react';
import { preloadImage } from '../../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  lazy?: boolean;
  quality?: 'low' | 'medium' | 'high';
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  lazy = true,
  quality = 'medium',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 根据质量设置生成不同尺寸的图片URL
  const generateSrcSet = (baseSrc: string): string => {
    const qualityMap = {
      low: [0.5, 0.75],
      medium: [0.75, 1, 1.5],
      high: [1, 1.5, 2],
    };

    const multipliers = qualityMap[quality];
    const srcSet = multipliers.map(multiplier => {
      // 这里可以根据实际的图片服务API来构建URL
      // 例如：`${baseSrc}?w=${width}&h=${height}&q=80 ${multiplier}x`
      return `${baseSrc} ${multiplier}x`;
    }).join(', ');

    return srcSet;
  };

  // 懒加载逻辑
  useEffect(() => {
    if (!lazy || !imgRef.current) {
      loadImage();
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadImage();
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // 提前50px开始加载
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, lazy]);

  const loadImage = async () => {
    try {
      // 预加载图片
      await preloadImage(src);
      setCurrentSrc(src);
      setIsLoaded(true);
      onLoad?.();
    } catch (error) {
      setIsError(true);
      onError?.();
    }
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsError(true);
    onError?.();
  };

  // 错误状态
  if (isError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}
        style={{ width, height }}
      >
        <svg 
          className="w-8 h-8" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 占位符 */}
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          style={{ width, height }}
        />
      )}
      
      {/* 加载指示器 */}
      {!isLoaded && !placeholder && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="w-8 h-8 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {/* 主图片 */}
      <img
        ref={imgRef}
        src={currentSrc}
        srcSet={currentSrc ? generateSrcSet(currentSrc) : undefined}
        sizes={width ? `${width}px` : '100vw'}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } w-full h-full object-cover`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
      />
    </div>
  );
};

export default OptimizedImage;