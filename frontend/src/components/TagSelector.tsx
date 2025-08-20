import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface TagSelectorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  maxTagLength?: number;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  onChange,
  maxTags = 10,
  maxTagLength = 20,
  placeholder = '添加标签...',
  suggestions = [],
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 默认标签建议
  const defaultSuggestions = [
    '健康', '疾病', '营养', '训练', '行为', '美容', '医疗',
    '疫苗', '驱虫', '绝育', '怀孕', '幼犬', '老年犬',
    '金毛', '拉布拉多', '泰迪', '比熊', '柯基', '哈士奇',
    '英短', '美短', '布偶', '暹罗', '波斯', '加菲',
    '求助', '分享', '经验', '推荐', '咨询'
  ];

  const allSuggestions = [...suggestions, ...defaultSuggestions];

  // 过滤建议标签
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(suggestion)
      );
      setFilteredSuggestions(filtered.slice(0, 8)); // 最多显示8个建议
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, tags, allSuggestions]);

  // 添加标签
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag &&
      !tags.includes(trimmedTag) &&
      tags.length < maxTags &&
      trimmedTag.length <= maxTagLength
    ) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 检查是否包含逗号或空格，如果有则添加标签
    if (value.includes(',') || value.includes(' ')) {
      const newTags = value.split(/[,\s]+/).filter(tag => tag.trim());
      newTags.forEach(tag => addTag(tag));
      return;
    }
    
    setInputValue(value);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // 如果输入为空且按下退格键，删除最后一个标签
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 标签容器 */}
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg min-h-[44px] focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
        {/* 已选标签 */}
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-orange-600 hover:text-orange-800"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        
        {/* 输入框 */}
        {tags.length < maxTags && (
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="border-none outline-none bg-transparent text-sm min-w-[100px] flex-1"
              maxLength={maxTagLength}
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => addTag(inputValue)}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 建议列表 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>
          {tags.length}/{maxTags} 个标签
        </span>
        <span>
          按回车或逗号添加标签
        </span>
      </div>
    </div>
  );
};