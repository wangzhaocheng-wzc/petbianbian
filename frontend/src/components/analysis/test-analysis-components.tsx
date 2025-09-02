// Test file to verify analysis components work correctly
import React from 'react';
import { HealthStatusVisualization } from './HealthStatusVisualization';
import { SaveShareActions } from './SaveShareActions';
import { AnalysisResultsDisplay } from './AnalysisResultsDisplay';
import { PoopRecord, Pet } from '../../../../shared/types';

// Mock data for testing
const mockRecord: PoopRecord = {
  id: 'test-record-1',
  petId: 'test-pet-1',
  userId: 'test-user-1',
  imageUrl: '/test-image.jpg',
  analysis: {
    shape: 'type4',
    healthStatus: 'healthy',
    confidence: 85,
    details: '便便形状正常，颜色健康，质地适中。',
    recommendations: [
      '继续保持当前的饮食习惯',
      '确保充足的水分摄入',
      '定期运动有助于消化健康'
    ],
    detectedFeatures: {
      color: '棕色',
      texture: '光滑',
      consistency: '适中',
      size: '正常'
    },
    healthStatusDescription: '健康状态良好',
    shapeDescription: '香肠状，表面光滑'
  },
  timestamp: new Date(),
  isShared: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockPet: Pet = {
  id: 'test-pet-1',
  name: '小白',
  type: 'dog',
  breed: '金毛',
  age: 24,
  weight: 25,
  ownerId: 'test-user-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Test component to verify all analysis components render correctly
export const TestAnalysisComponents: React.FC = () => {
  const handleSave = async (record: PoopRecord) => {
    console.log('保存记录:', record);
  };

  const handleShare = async (record: PoopRecord) => {
    console.log('分享记录:', record);
  };

  const handleRetakePhoto = () => {
    console.log('重新拍照');
  };

  const handleViewHistory = () => {
    console.log('查看历史');
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900">分析组件测试</h1>
      
      {/* 健康状态可视化组件测试 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">健康状态可视化</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthStatusVisualization
            record={mockRecord}
            showDetails={true}
            interactive={true}
            size="sm"
          />
          <HealthStatusVisualization
            record={mockRecord}
            showDetails={true}
            interactive={false}
            size="md"
          />
          <HealthStatusVisualization
            record={mockRecord}
            showDetails={false}
            interactive={true}
            size="lg"
          />
        </div>
      </div>

      {/* 保存分享操作组件测试 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">保存分享操作</h2>
        <div className="bg-white p-6 rounded-lg">
          <SaveShareActions
            record={mockRecord}
            petName={mockPet.name}
            isNew={true}
            onSave={handleSave}
            onShareToCommunity={handleShare}
          />
        </div>
      </div>

      {/* 分析结果展示组件测试 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">分析结果展示</h2>
        <AnalysisResultsDisplay
          record={mockRecord}
          pet={mockPet}
          isNew={true}
          onSave={handleSave}
          onRetakePhoto={handleRetakePhoto}
          onViewHistory={handleViewHistory}
          onShareToCommunity={handleShare}
        />
      </div>
    </div>
  );
};

export default TestAnalysisComponents;