import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Debug: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">认证状态调试</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <strong>加载状态:</strong> {isLoading ? '加载中' : '已加载'}
        </div>
        
        <div>
          <strong>认证状态:</strong> {isAuthenticated ? '已认证' : '未认证'}
        </div>
        
        <div>
          <strong>用户信息:</strong>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-sm">
            {user ? JSON.stringify(user, null, 2) : '无用户信息'}
          </pre>
        </div>
        
        <div>
          <strong>本地存储:</strong>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-sm">
            {JSON.stringify({
              accessToken: localStorage.getItem('ACCESS_TOKEN') ? '存在' : '不存在',
              refreshToken: localStorage.getItem('REFRESH_TOKEN') ? '存在' : '不存在'
            }, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>当前路径:</strong> {window.location.pathname}
        </div>
      </div>
    </div>
  );
};

export default Debug;