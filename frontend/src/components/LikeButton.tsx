import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onToggle: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likesCount,
  onToggle,
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onToggle();
    } catch (error) {
      console.error('点赞操作失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 20;
      default:
        return 16;
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        flex items-center space-x-1 transition-colors duration-200
        ${getSizeClasses()}
        ${isLiked 
          ? 'text-red-600 hover:text-red-700' 
          : 'text-gray-500 hover:text-red-600'
        }
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <Heart 
        size={getIconSize()} 
        className={`
          transition-all duration-200
          ${isLiked ? 'fill-current scale-110' : ''}
          ${isLoading ? 'animate-pulse' : ''}
        `} 
      />
      <span className="font-medium">
        {isLoading ? '...' : likesCount}
      </span>
    </button>
  );
};