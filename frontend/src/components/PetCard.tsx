import React from 'react';
import { Pet } from '../../../shared/types';
import { Edit, Trash2, Dog, Cat, Heart } from 'lucide-react';

interface PetCardProps {
  pet: Pet;
  onEdit: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onEdit, onDelete }) => {
  const getPetIcon = (type: string) => {
    switch (type) {
      case 'dog':
        return <Dog className="w-6 h-6 text-orange-500" />;
      case 'cat':
        return <Cat className="w-6 h-6 text-orange-500" />;
      default:
        return <Heart className="w-6 h-6 text-orange-500" />;
    }
  };

  const getPetTypeText = (type: string) => {
    switch (type) {
      case 'dog':
        return '狗狗';
      case 'cat':
        return '猫咪';
      default:
        return '其他';
    }
  };

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'male':
        return '♂ 公';
      case 'female':
        return '♀ 母';
      default:
        return '';
    }
  };

  const formatAge = (age?: number) => {
    if (!age) return '';
    if (age < 12) {
      return `${age}个月`;
    } else {
      const years = Math.floor(age / 12);
      const months = age % 12;
      return months > 0 ? `${years}岁${months}个月` : `${years}岁`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      {/* 宠物头像和基本信息 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            {pet.avatar ? (
              <img
                src={pet.avatar}
                alt={pet.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              getPetIcon(pet.type)
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{getPetTypeText(pet.type)}</span>
              {pet.breed && <span>• {pet.breed}</span>}
              {pet.gender && <span>• {getGenderText(pet.gender)}</span>}
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(pet)}
            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
            title="编辑宠物信息"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(pet)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="删除宠物"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 详细信息 */}
      <div className="space-y-2">
        {pet.age && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">年龄:</span>
            <span className="text-gray-900">{formatAge(pet.age)}</span>
          </div>
        )}
        {pet.weight && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">体重:</span>
            <span className="text-gray-900">{pet.weight}kg</span>
          </div>
        )}
        {pet.description && (
          <div className="text-sm">
            <span className="text-gray-600">描述:</span>
            <p className="text-gray-900 mt-1 line-clamp-2">{pet.description}</p>
          </div>
        )}
      </div>

      {/* 医疗历史 */}
      {pet.medicalHistory && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {pet.medicalHistory.allergies.length > 0 && (
              <div className="mb-1">
                <span className="font-medium">过敏:</span> {pet.medicalHistory.allergies.join(', ')}
              </div>
            )}
            {pet.medicalHistory.conditions.length > 0 && (
              <div>
                <span className="font-medium">病史:</span> {pet.medicalHistory.conditions.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 记录信息 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center text-sm">
          <div className="text-gray-600">
            记录数量: <span className="text-orange-500 font-medium">{pet.recordCount || 0}</span>
          </div>
          {pet.lastRecordDate && (
            <div className="text-gray-600">
              最近记录: <span className="text-gray-900">{new Date(pet.lastRecordDate).toLocaleDateString('zh-CN')}</span>
            </div>
          )}
        </div>
      </div>

      {/* 创建时间 */}
      <div className="mt-4 text-xs text-gray-400">
        添加于 {new Date(pet.createdAt).toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
};

export default PetCard;