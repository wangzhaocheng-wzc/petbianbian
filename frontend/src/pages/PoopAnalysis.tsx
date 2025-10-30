import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PawPrint, TrendingUp, Calendar } from 'lucide-react';
import PoopAnalysisUpload from '../components/PoopAnalysisUpload';
import { AnalysisResult } from '../components/AnalysisResult';
import { HealthStatusVisualization, SaveShareActions } from '../components/analysis';
import { usePets } from '../hooks/usePets';
import { useMobile } from '../hooks/useMobile';
import { PoopRecord } from '../../../shared/types';
import { resolveImageUrl } from '@/utils/imageUrlResolver';
import { AnalysisService } from '../services/analysisService';
import TouchButton from '../components/common/TouchButton';

const PoopAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { pets, loading: petsLoading } = usePets();
  const { isMobile } = useMobile();
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [recentAnalyses, setRecentAnalyses] = useState<PoopRecord[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<PoopRecord | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // 如果只有一只宠物，自动选择
    if (pets.length === 1) {
      const defaultId = pets[0].externalId ?? pets[0].id;
      setSelectedPetId(defaultId);
    }
  }, [pets]);

  const handleAnalysisComplete = (result: PoopRecord) => {
    setCurrentAnalysis(result);
    setRecentAnalyses(prev => [result, ...prev.slice(0, 4)]); // 保留最近5次分析
    setShowResults(true);
  };

  const handleAnalysisError = (error: string) => {
    console.error('分析错误:', error);
  };

  const handleSaveRecord = async (record: PoopRecord) => {
    console.log('🔍 开始保存记录:', record);
    console.log('🔍 记录ID:', record.id);
    console.log('🔍 用户备注:', record.userNotes);
    console.log('🔍 症状:', record.symptoms);
    
    try {
      const response = await AnalysisService.updateAnalysisRecord(record.id, {
        userNotes: record.userNotes,
        symptoms: record.symptoms,
        isShared: false
      });
      
      console.log('🔍 保存响应:', response);
      
      if (response.success) {
        console.log('✅ 记录保存成功');
      } else {
        console.error('❌ 保存失败:', response.message);
      }
    } catch (error) {
      console.error('❌ 保存记录失败:', error);
      throw error;
    }
  };

  const handleShareToCommunity = async (record: PoopRecord) => {
    try {
      const response = await AnalysisService.shareToCommunity(record.id);
      if (response.success) {
        console.log('分享到社区成功');
      }
    } catch (error) {
      console.error('分享到社区失败:', error);
      throw error;
    }
  };

  const handleRetakePhoto = () => {
    setShowResults(false);
    setCurrentAnalysis(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'concerning':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '健康';
      case 'warning':
        return '需要注意';
      case 'concerning':
        return '需要关注';
      default:
        return '未知';
    }
  };

  if (petsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <TouchButton
                onClick={() => navigate('/')}
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                className="text-gray-400 hover:text-gray-600"
              >
              </TouchButton>
              <h1 className="text-xl font-semibold text-gray-900">便便健康分析</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <TouchButton
                onClick={() => navigate('/records')}
                variant="outline"
                size="sm"
                icon={TrendingUp}
              >
                <span className={isMobile ? 'hidden xs:inline' : ''}>查看记录</span>
              </TouchButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* 主要内容区域 */}
          <div className="lg:col-span-2">
            {/* 宠物选择 */}
            {pets.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">选择宠物</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => setSelectedPetId(pet.externalId ?? pet.id)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all min-h-[80px] touch:min-h-[88px] ${
                        selectedPetId === (pet.externalId ?? pet.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        {pet.avatar ? (
                          <img
                            src={pet.avatar}
                            alt={pet.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <PawPrint className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">{pet.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{pet.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 分析结果展示 */}
            {showResults && currentAnalysis ? (
              <div className="mb-6">
                {/* 健康状态可视化 */}
                <div className="mb-6">
                  <HealthStatusVisualization
                    record={currentAnalysis}
                    showDetails={true}
                    interactive={true}
                    size="lg"
                  />
                </div>

                {/* 保存和分享操作 */}
                <div className="mb-6">
                  <SaveShareActions
                    record={currentAnalysis}
                    petName={pets.find(p => p.id === selectedPetId)?.name || '宠物'}
                    isNew={true}
                    onSave={handleSaveRecord}
                    onShareToCommunity={handleShareToCommunity}
                  />
                </div>

                {/* 详细分析结果 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">详细分析结果</h2>
                    <button
                      onClick={handleRetakePhoto}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      重新分析
                    </button>
                  </div>
                  <AnalysisResult
                    record={currentAnalysis}
                    onShare={handleShareToCommunity}
                    onSave={handleSaveRecord}
                    showActions={false} // 我们在上面已经显示了操作按钮
                    isNew={true}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* 分析上传组件 */}
                {selectedPetId ? (
                  <PoopAnalysisUpload
                    petId={selectedPetId}
                    onAnalysisComplete={handleAnalysisComplete}
                    onError={handleAnalysisError}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
                    <PawPrint className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择宠物</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                      {pets.length === 0 
                        ? '您还没有添加宠物，请先添加宠物信息'
                        : '请选择要进行健康分析的宠物'
                      }
                    </p>
                    {pets.length === 0 && (
                      <TouchButton
                        onClick={() => navigate('/pets')}
                        variant="primary"
                        size="lg"
                        fullWidth={isMobile}
                      >
                        添加宠物
                      </TouchButton>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-4 lg:space-y-6">
            {/* 最近分析 */}
            {recentAnalyses.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">最近分析</h3>
                <div className="space-y-3 sm:space-y-4">
                  {recentAnalyses.map((analysis) => (
                    <div key={analysis.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={resolveImageUrl(analysis.imageUrl)}
                        alt="分析图片"
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/pwa-192x192.png';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(analysis.analysis.healthStatus)}`}>
                            {getHealthStatusText(analysis.analysis.healthStatus)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {analysis.analysis.confidence}%
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                          {analysis.analysis.details}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500">
                            {formatDate(analysis.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 健康提示 */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">健康提示</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600">
                    正常的便便应该是棕色、成形且不太硬也不太软
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600">
                    便便颜色、形状的变化可能反映健康状况
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600">
                    持续异常情况建议及时咨询兽医
                  </p>
                </div>
              </div>
            </div>

            {/* 便便形状参考 */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">便便形状参考</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">类型1-2:</span>
                  <span className="text-red-600 font-medium">过硬</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">类型3-4:</span>
                  <span className="text-green-600 font-medium">正常</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">类型5-7:</span>
                  <span className="text-yellow-600 font-medium">过软</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoopAnalysis;