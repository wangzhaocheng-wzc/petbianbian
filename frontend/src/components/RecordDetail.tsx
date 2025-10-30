import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Thermometer, 
  Droplets,
  Edit,
  Save,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Share2,
  Download
} from 'lucide-react';
import { HealthRecord } from '../services/recordsService';
import { resolveImageUrl } from '@/utils/imageUrlResolver';

interface RecordDetailProps {
  record: HealthRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (data: { userNotes?: string; symptoms?: string[]; isShared?: boolean }) => void;
  onDelete?: () => void;
}

const RecordDetail: React.FC<RecordDetailProps> = ({
  record,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    userNotes: record.userNotes || '',
    symptoms: record.symptoms || [],
    isShared: record.isShared
  });
  const [newSymptom, setNewSymptom] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      userNotes: record.userNotes || '',
      symptoms: record.symptoms || [],
      isShared: record.isShared
    });
    setIsEditing(false);
  };

  const addSymptom = () => {
    if (newSymptom.trim() && !editData.symptoms.includes(newSymptom.trim())) {
      setEditData(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, newSymptom.trim()]
      }));
      setNewSymptom('');
    }
  };

  const removeSymptom = (symptom: string) => {
    setEditData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter(s => s !== symptom)
    }));
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'concerning':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'concerning':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">记录详情</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getHealthStatusColor(record.analysis.healthStatus)}`}>
              {getHealthStatusIcon(record.analysis.healthStatus)}
              <span className="text-sm font-medium">
                {record.analysis.healthStatusDescription}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
                编辑
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：图片和基本信息 */}
            <div>
              {/* 宠物信息 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">宠物信息</h3>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  {record.pet.avatar ? (
                    <img
                      src={record.pet.avatar}
                      alt={record.pet.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xl text-gray-500">
                        {record.pet.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{record.pet.name}</h4>
                    <p className="text-gray-600">{record.pet.breed || record.pet.type}</p>
                  </div>
                </div>
              </div>

              {/* 分析图片 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">分析图片</h3>
                <div className="relative">
                  <img
                    src={resolveImageUrl(record.imageUrl)}
                    alt="分析图片"
                    className="w-full rounded-lg shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/pwa-192x192.png';
                    }}
                  />
                  <button
                    onClick={() => window.open(resolveImageUrl(record.imageUrl), '_blank')}
                    className="absolute top-2 right-2 p-2 bg-white bg-opacity-80 rounded-lg hover:bg-opacity-100"
                    title="下载图片"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 时间和位置信息 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>记录时间：{formatDate(record.timestamp)}</span>
                </div>
                
                {record.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      位置：{record.location.latitude.toFixed(6)}, {record.location.longitude.toFixed(6)}
                    </span>
                  </div>
                )}

                {record.weather && (
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      <span>{record.weather.temperature}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      <span>{record.weather.humidity}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：分析结果和用户信息 */}
            <div>
              {/* 分析结果 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">分析结果</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">形状类型</span>
                        <p className="font-medium">{record.analysis.shapeDescription}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">置信度</span>
                        <p className="font-medium">{record.analysis.confidence}%</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-sm text-gray-600">详细分析</span>
                      <p className="mt-1 text-gray-900">{record.analysis.details}</p>
                    </div>

                    {record.analysis.detectedFeatures && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">颜色：</span>
                          <span className="font-medium">{record.analysis.detectedFeatures.color}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">质地：</span>
                          <span className="font-medium">{record.analysis.detectedFeatures.texture}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">稠度：</span>
                          <span className="font-medium">{record.analysis.detectedFeatures.consistency}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">大小：</span>
                          <span className="font-medium">{record.analysis.detectedFeatures.size}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 建议 */}
                  {record.analysis.recommendations && record.analysis.recommendations.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">健康建议</span>
                      <ul className="mt-2 space-y-1">
                        {record.analysis.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-orange-500 mt-1">•</span>
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 用户备注 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">用户备注</h3>
                {isEditing ? (
                  <textarea
                    value={editData.userNotes}
                    onChange={(e) => setEditData(prev => ({ ...prev, userNotes: e.target.value }))}
                    placeholder="添加备注..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">
                      {record.userNotes || '暂无备注'}
                    </p>
                  </div>
                )}
              </div>

              {/* 症状 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">相关症状</h3>
                {isEditing ? (
                  <div>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newSymptom}
                        onChange={(e) => setNewSymptom(e.target.value)}
                        placeholder="添加症状"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                      />
                      <button
                        onClick={addSymptom}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                      >
                        添加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editData.symptoms.map((symptom, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {symptom}
                          <button
                            onClick={() => removeSymptom(symptom)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {record.symptoms && record.symptoms.length > 0 ? (
                      record.symptoms.map((symptom, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {symptom}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">暂无症状记录</p>
                    )}
                  </div>
                )}
              </div>

              {/* 分享设置 */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">分享设置</h3>
                  {isEditing ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.isShared}
                        onChange={(e) => setEditData(prev => ({ ...prev, isShared: e.target.checked }))}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">分享到社区</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Share2 className={`w-4 h-4 ${record.isShared ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-700">
                        {record.isShared ? '已分享到社区' : '未分享'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 编辑操作按钮 */}
              {isEditing && (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        {!isEditing && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <div className="text-sm text-gray-500">
              创建时间：{formatDate(record.createdAt)}
              {record.updatedAt !== record.createdAt && (
                <span className="ml-4">
                  更新时间：{formatDate(record.updatedAt)}
                </span>
              )}
            </div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                删除记录
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordDetail;