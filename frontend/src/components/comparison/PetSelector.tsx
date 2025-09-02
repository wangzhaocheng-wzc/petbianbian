import React from 'react';
import { Check, Calendar, BarChart3 } from 'lucide-react';
import comparisonService, { PetForComparison } from '../../services/comparisonService';

interface PetSelectorProps {
  pets: PetForComparison[];
  selectedPetIds: string[];
  onSelectionChange: (petIds: string[]) => void;
  days: number;
  onDaysChange: (days: number) => void;
}

const PetSelector: React.FC<PetSelectorProps> = ({
  pets,
  selectedPetIds,
  onSelectionChange,
  days,
  onDaysChange
}) => {
  const handlePetToggle = (petId: string) => {
    if (selectedPetIds.includes(petId)) {
      // 取消选择
      onSelectionChange(selectedPetIds.filter(id => id !== petId));
    } else {
      // 添加选择
      if (selectedPetIds.length < 5) {
        onSelectionChange([...selectedPetIds, petId]);
      }
    }
  };

  const daysOptions = [
    { value: 7, label: '7天' },
    { value: 14, label: '14天' },
    { value: 30, label: '30天' },
    { value: 60, label: '60天' },
    { value: 90, label: '90天' }
  ];

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div>
        <div className="flex items-center mb-3">
          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
          <label className="text-sm font-medium text-gray-700">对比时间范围</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {daysOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onDaysChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === option.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 宠物选择 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
            <label className="text-sm font-medium text-gray-700">选择宠物进行对比</label>
          </div>
          <span className="text-sm text-gray-500">
            已选择 {selectedPetIds.length}/5
          </span>
        </div>

        {pets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无宠物数据</p>
            <p className="text-sm mt-1">请先添加宠物信息</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map(pet => {
              const isSelected = selectedPetIds.includes(pet.id);
              const canSelect = selectedPetIds.length < 5 || isSelected;

              return (
                <div
                  key={pet.id}
                  onClick={() => canSelect && handlePetToggle(pet.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : canSelect
                      ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  {/* 选中标识 */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}

                  {/* 宠物头像 */}
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                      {pet.avatar ? (
                        <img
                          src={pet.avatar}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 text-lg font-medium">
                          {pet.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-500">
                        {comparisonService.getPetTypeText(pet.type)}
                        {pet.breed && ` · ${pet.breed}`}
                      </p>
                    </div>
                  </div>

                  {/* 宠物信息 */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">年龄:</span>
                      <span className="text-gray-900">
                        {comparisonService.formatAge(pet.age)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">体重:</span>
                      <span className="text-gray-900">
                        {comparisonService.formatWeight(pet.weight)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">记录数:</span>
                      <span className={`font-medium ${
                        pet.recordCount > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {pet.recordCount}条
                      </span>
                    </div>
                    {pet.lastRecordDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">最近记录:</span>
                        <span className="text-gray-900">
                          {new Date(pet.lastRecordDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 记录状态指示 */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {pet.recordCount > 0 ? (
                      <div className="flex items-center text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-xs">有健康记录</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                        <span className="text-xs">暂无记录</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 选择提示 */}
        {pets.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>提示：</strong>
              至少选择2个宠物进行对比，最多可选择5个。建议选择有健康记录的宠物以获得更准确的分析结果。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetSelector;