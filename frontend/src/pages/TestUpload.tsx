import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import AvatarUpload from '../components/AvatarUpload';
import CommunityImageUpload from '../components/CommunityImageUpload';

const TestUpload: React.FC = () => {
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [communityImages, setCommunityImages] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (files: File[]) => {
    console.log('TestUpload: 选择的文件:', files);
    console.log('TestUpload: 文件详情:', files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    })));
  };

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
    console.log('头像URL:', url);
  };

  const handleCommunityImagesChange = (urls: string[]) => {
    setCommunityImages(urls);
    console.log('社区图片URLs:', urls);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    console.error('上传错误:', errorMsg);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">文件上传组件测试</h1>
        
        {/* 错误信息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-12">
          {/* 基础文件上传组件 */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基础文件上传</h2>
            <FileUpload
              onFileSelect={handleFileSelect}
              maxFiles={3}
              multiple={true}
              error={error}
            />
          </section>

          {/* 头像上传组件 */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">头像上传</h2>
            <div className="flex items-center space-x-8">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">小尺寸</h3>
                <AvatarUpload
                  size="sm"
                  currentAvatar={avatarUrl}
                  onAvatarChange={handleAvatarChange}
                  onError={handleError}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">中等尺寸</h3>
                <AvatarUpload
                  size="md"
                  currentAvatar={avatarUrl}
                  onAvatarChange={handleAvatarChange}
                  onError={handleError}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">大尺寸</h3>
                <AvatarUpload
                  size="lg"
                  currentAvatar={avatarUrl}
                  onAvatarChange={handleAvatarChange}
                  onError={handleError}
                />
              </div>
            </div>
            {avatarUrl && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">当前头像URL: {avatarUrl}</p>
              </div>
            )}
          </section>

          {/* 社区图片上传组件 */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">社区图片上传</h2>
            <CommunityImageUpload
              onImagesChange={handleCommunityImagesChange}
              onError={handleError}
              maxImages={5}
            />
            {communityImages.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-2">已上传的图片:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {communityImages.map((url, index) => (
                    <li key={index}>{url}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 便便分析上传测试 */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">便便分析上传测试</h2>
            <p className="text-gray-600 mb-4">
              这个组件需要选择宠物ID，请前往 <a href="/analysis" className="text-orange-500 hover:text-orange-600">便便分析页面</a> 进行测试。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TestUpload;