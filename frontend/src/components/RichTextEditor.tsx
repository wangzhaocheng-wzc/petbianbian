import React, { useState, useRef } from 'react';
import { Bold, Italic, List, Link, Image, Eye, Edit } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容...',
  maxLength = 10000,
  onImageUpload,
  className = ''
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 插入文本到光标位置
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // 格式化按钮处理
  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('*', '*');
  const handleList = () => insertText('\n- ', '');
  const handleLink = () => {
    const url = prompt('请输入链接地址:');
    if (url) {
      insertText('[链接文字](', `${url})`);
    }
  };

  // 图片上传处理
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImageUpload) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB');
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await onImageUpload(file);
      insertText(`![图片](${imageUrl})`);
    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败，请重试');
    } finally {
      setIsUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 简单的Markdown渲染
  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleBold}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="粗体"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={handleItalic}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="斜体"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={handleList}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="列表"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={handleLink}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="链接"
          >
            <Link size={16} />
          </button>
          {onImageUpload && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-50"
                title="插入图片"
              >
                <Image size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {value.length}/{maxLength}
          </span>
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`p-1.5 rounded ${
              isPreview 
                ? 'text-orange-600 bg-orange-100' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            }`}
            title={isPreview ? '编辑模式' : '预览模式'}
          >
            {isPreview ? <Edit size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="relative">
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-sm text-gray-600">上传中...</div>
          </div>
        )}
        
        {isPreview ? (
          <div 
            className="p-4 min-h-[200px] prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full p-4 min-h-[200px] resize-none border-none outline-none"
            style={{ fontFamily: 'inherit' }}
          />
        )}
      </div>
    </div>
  );
};