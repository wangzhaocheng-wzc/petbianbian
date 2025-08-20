import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PawPrint, TrendingUp, Calendar } from 'lucide-react';
import PoopAnalysisUpload from '../components/PoopAnalysisUpload';
import { AnalysisResult } from '../components/AnalysisResult';
import { usePets } from '../hooks/usePets';
import { PoopRecord } from '../../../shared/types';

const PoopAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { pets, loading: petsLoading } = usePets();
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [recentAnalyses, setRecentAnalyses] = useState<PoopRecord[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<PoopRecord | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // 如果只有一只宠物，自动选择
    if (pets.length === 1) {
      setSelectedPetId(pets[0].id);
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
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">便便健康分析</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/records')}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                <span>查看记录</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主要内容区域 */}
          <div className="lg:col-span-2">
            {/* 宠物选择 */}
            {pets.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">选择宠物</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPetId === pet.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        {pet.avatar ? (
                          <img
                            src={pet.avatar}
                            alt={pet.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <PawPrint className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">{pet.name}</span>
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">分析结果</h2>
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setCurrentAnalysis(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    重新分析
                  </button>
                </div>
                <AnalysisResult
                  record={currentAnalysis}
                  onShare={(record) => {
                    // TODO: 实现分享功能
                    console.log('分享记录:', record);
                  }}
                  showActions={true}
                />
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
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择宠物</h3>
                    <p className="text-gray-600">
                      {pets.length === 0 
                        ? '您还没有添加宠物，请先添加宠物信息'
                        : '请选择要进行健康分析的宠物'
                      }
                    </p>
                    {pets.length === 0 && (
                      <button
                        onClick={() => navigate('/pets')}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                      >
                        添加宠物
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 最近分析 */}
            {recentAnalyses.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">最近分析</h3>
                <div className="space-y-4">
                  {recentAnalyses.map((analysis) => (
                    <div key={analysis.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={analysis.imageUrl}
                        alt="分析图片"
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(analysis.analysis.healthStatus)}`}>
                            {getHealthStatusText(analysis.analysis.healthStatus)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {analysis.analysis.confidence}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {analysis.analysis.details}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">健康提示</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">
                    正常的便便应该是棕色、成形且不太硬也不太软
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">
                    便便颜色、形状的变化可能反映健康状况
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-600">
                    持续异常情况建议及时咨询兽医
                  </p>
                </div>
              </div>
            </div>

            {/* 便便形状参考 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">便便形状参考</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">类型1-2:</span>
                  <span className="text-red-600">过硬</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">类型3-4:</span>
                  <span className="text-green-600">正常</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">类型5-7:</span>
                  <span className="text-yellow-600">过软</span>
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