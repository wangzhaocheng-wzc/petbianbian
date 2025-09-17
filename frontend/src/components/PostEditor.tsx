import React, { useState, useEffect } from 'react';
import { Save, Eye, X, Upload, Trash2 } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { TagSelector } from './TagSelector';
import { communityService } from '../services/communityService';
import { CreatePostRequest, UpdatePostRequest, CommunityPost, Pet } from '../../../shared/types';

interface PostEditorProps {
  post?: CommunityPost;
  pets?: Pet[];
  onSave: (data: CreatePostRequest | UpdatePostRequest) => Promise<void>;
  onCancel: () => void;
  onPreview?: (data: CreatePostRequest | UpdatePostRequest) => void;
  className?: string;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  post,
  pets = [],
  onSave,
  onCancel,
  onPreview,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    content: post?.content || '',
    petId: post?.petId || '',
    category: post?.category || 'general' as const,
    tags: post?.tags || [],
    images: post?.images || [],
    isAnonymous: post?.isAnonymous || false // 是否匿名发布
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 分类选项
  const categories = [
    { value: 'general', label: '日常分享' },
    { value: 'health', label: '健康分享' },
    { value: 'help', label: '求助问答' },
    { value: 'experience', label: '经验分享' }
  ];

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    } else if (formData.title.length > 200) {
      newErrors.title = '标题长度不能超过200个字符';
    }

    if (!formData.content.trim()) {
      newErrors.content = '内容不能为空';
    } else if (formData.content.length > 10000) {
      newErrors.content = '内容长度不能超过10000个字符';
    }

    if (formData.tags.length > 10) {
      newErrors.tags = '标签数量不能超过10个';
    }

    if (formData.images.length > 9) {
      newErrors.images = '图片数量不能超过9张';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理预览
  const handlePreview = () => {
    if (!validateForm()) return;
    onPreview?.(formData);
  };

  // 处理图片上传
  const handleImageUpload = async (file: File): Promise<string> => {
    const uploadId = Math.random().toString(36).substr(2, 9);
    setUploadingImages(prev => [...prev, uploadId]);

    try {
      const response = await communityService.uploadImage(file);
      if (response.success && response.data) {
        const imageUrl = response.data.url;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, imageUrl]
        }));
        return imageUrl;
      } else {
        throw new Error(response.message || '图片上传失败');
      }
    } finally {
      setUploadingImages(prev => prev.filter(id => id !== uploadId));
    }
  };

  // 删除图片
  const handleRemoveImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(url => url !== imageUrl)
    }));
  };

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      if (formData.images.length >= 9) {
        alert('最多只能上传9张图片');
        break;
      }
      
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} 不是有效的图片文件`);
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} 文件大小超过10MB`);
        continue;
      }
      
      try {
        await handleImageUpload(file);
      } catch (error) {
        console.error('图片上传失败:', error);
        alert(`${file.name} 上传失败`);
      }
    }
    
    // 清空文件输入
    event.target.value = '';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {post ? '编辑帖子' : '发布新帖子'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* 表单内容 */}
      <div className="p-4 space-y-4">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标题 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="请输入帖子标题..."
            maxLength={200}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.title.length}/200
          </p>
        </div>

        {/* 分类和宠物选择 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                category: e.target.value as any 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {pets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                相关宠物
              </label>
              <select
                value={formData.petId}
                onChange={(e) => setFormData(prev => ({ ...prev, petId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">选择宠物（可选）</option>
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.type === 'dog' ? '狗' : pet.type === 'cat' ? '猫' : '其他'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 匿名发布选项 */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="anonymous-publish"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
          />
          <label htmlFor="anonymous-publish" className="text-sm text-gray-700">
            匿名发布（不显示用户名，默认显示为"匿名用户"）
          </label>
        </div>

        {/* 内容编辑器 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            内容 *
          </label>
          <RichTextEditor
            value={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
            placeholder="分享你的想法、经验或问题..."
            maxLength={10000}
            onImageUpload={handleImageUpload}
            className={errors.content ? 'border-red-500' : ''}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
        </div>

        {/* 图片上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            图片 ({formData.images.length}/9)
          </label>
          
          {/* 图片预览 */}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {formData.images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`图片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(imageUrl)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 上传按钮 */}
          {formData.images.length < 9 && (
            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload size={16} className="mr-2" />
                上传图片
              </label>
              {uploadingImages.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  上传中... ({uploadingImages.length})
                </span>
              )}
            </div>
          )}
          
          {errors.images && (
            <p className="mt-1 text-sm text-red-600">{errors.images}</p>
          )}
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>
          <TagSelector
            tags={formData.tags}
            onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
            maxTags={10}
            placeholder="添加相关标签..."
          />
          {errors.tags && (
            <p className="mt-1 text-sm text-red-600">{errors.tags}</p>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-500">
          * 为必填项
        </div>
        
        <div className="flex items-center space-x-3">
          {onPreview && (
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Eye size={16} className="mr-2" />
              预览
            </button>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} className="mr-2" />
            {loading ? '保存中...' : (post ? '更新' : '发布')}
          </button>
        </div>
      </div>
    </div>
  );
};