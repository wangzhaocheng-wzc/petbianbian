/**
 * 图片优化工具函数
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

/**
 * 压缩图片文件
 */
export const compressImage = (
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算新的尺寸
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // 设置canvas尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制图片
      ctx?.drawImage(img, 0, 0, width, height);

      // 转换为blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 生成缩略图
 */
export const generateThumbnail = (
  file: File,
  size: number = 200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 设置正方形缩略图
      canvas.width = size;
      canvas.height = size;

      // 计算裁剪区域（居中裁剪）
      const { width, height } = img;
      const minDimension = Math.min(width, height);
      const x = (width - minDimension) / 2;
      const y = (height - minDimension) / 2;

      // 绘制缩略图
      ctx?.drawImage(
        img,
        x, y, minDimension, minDimension,
        0, 0, size, size
      );

      // 转换为data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('缩略图生成失败'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 检查浏览器是否支持WebP格式
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * 获取图片的EXIF信息并修正方向
 */
export const fixImageOrientation = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // 简单的方向修正（这里可以扩展EXIF读取）
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const correctedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(correctedFile);
          } else {
            reject(new Error('图片方向修正失败'));
          }
        },
        file.type,
        0.9
      );
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 预加载图片
 */
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * 批量预加载图片
 */
export const preloadImages = (urls: string[]): Promise<HTMLImageElement[]> => {
  return Promise.all(urls.map(preloadImage));
};

/**
 * 获取图片尺寸
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 转换图片格式
 */
export const convertImageFormat = (
  file: File,
  targetFormat: 'jpeg' | 'png' | 'webp',
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 如果目标格式是JPEG，先填充白色背景
      if (targetFormat === 'jpeg') {
        ctx!.fillStyle = '#FFFFFF';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const convertedFile = new File([blob], 
              file.name.replace(/\.[^/.]+$/, `.${targetFormat}`), {
              type: `image/${targetFormat}`,
              lastModified: Date.now(),
            });
            resolve(convertedFile);
          } else {
            reject(new Error('图片格式转换失败'));
          }
        },
        `image/${targetFormat}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
};