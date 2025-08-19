import React, { useState, useEffect } from 'react';
import { Pet, CreatePetRequest, UpdatePetRequest } from '../../../shared/types';
import { X, Plus, Minus } from 'lucide-react';

interface PetFormProps {
  pet?: Pet | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePetRequest | UpdatePetRequest) => Promise<boolean>;
  loading: boolean;
}

const PetForm: React.FC<PetFormProps> = ({ pet, isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState<CreatePetRequest>({
    name: '',
    type: 'dog',
    breed: '',
    gender: undefined,
    age: undefined,
    weight: undefined,
    description: '',
    medicalHistory: {
      allergies: [],
      medications: [],
      conditions: []
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当pet变化时更新表单数据
  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name,
        type: pet.type,
        breed: pet.breed || '',
        gender: pet.gender,
        age: pet.age,
        weight: pet.weight,
        description: pet.description || '',
        medicalHistory: pet.medicalHistory || {
          allergies: [],
          medications: [],
          conditions: []
        }
      });
    } else {
      setFormData({
        name: '',
        type: 'dog',
        breed: '',
        gender: undefined,
        age: undefined,
        weight: undefined,
        description: '',
        medicalHistory: {
          allergies: [],
          medications: [],
          conditions: []
        }
      });
    }
    setErrors({});
  }, [pet, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '宠物名称是必填项';
    } else if (formData.name.length > 20) {
      newErrors.name = '宠物名称不能超过20个字符';
    }

    if (!formData.type) {
      newErrors.type = '宠物类型是必填项';
    }

    if (formData.breed && formData.breed.length > 50) {
      newErrors.breed = '品种名称不能超过50个字符';
    }

    if (formData.age !== undefined && (formData.age < 0 || formData.age > 360)) {
      newErrors.age = '年龄必须在0-360个月之间';
    }

    if (formData.weight !== undefined && (formData.weight < 0 || formData.weight > 200)) {
      newErrors.weight = '体重必须在0-200kg之间';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述不能超过500个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await onSubmit(formData);
    if (success) {
      onClose();
    }
  };

  const handleInputChange = (field: keyof CreatePetRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMedicalHistoryChange = (
    category: 'allergies' | 'medications' | 'conditions',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory!,
        [category]: prev.medicalHistory![category].map((item, i) => 
          i === index ? value : item
        )
      }
    }));
  };

  const addMedicalHistoryItem = (category: 'allergies' | 'medications' | 'conditions') => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory!,
        [category]: [...prev.medicalHistory![category], '']
      }
    }));
  };

  const removeMedicalHistoryItem = (
    category: 'allergies' | 'medications' | 'conditions',
    index: number
  ) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory!,
        [category]: prev.medicalHistory![category].filter((_, i) => i !== index)
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {pet ? '编辑宠物信息' : '添加新宠物'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                宠物名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入宠物名称"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                宠物类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as 'dog' | 'cat' | 'other')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="dog">狗狗</option>
                <option value="cat">猫咪</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">品种</label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) => handleInputChange('breed', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.breed ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入品种"
              />
              {errors.breed && <p className="mt-1 text-sm text-red-500">{errors.breed}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">性别</label>
              <select
                value={formData.gender || ''}
                onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">请选择性别</option>
                <option value="male">公</option>
                <option value="female">母</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">年龄（月）</label>
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.age ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入年龄"
                min="0"
                max="360"
              />
              {errors.age && <p className="mt-1 text-sm text-red-500">{errors.age}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">体重（kg）</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.weight ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入体重"
                min="0"
                max="200"
              />
              {errors.weight && <p className="mt-1 text-sm text-red-500">{errors.weight}</p>}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入宠物描述"
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* 医疗历史 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">医疗历史</h3>
            
            {/* 过敏史 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">过敏史</label>
                <button
                  type="button"
                  onClick={() => addMedicalHistoryItem('allergies')}
                  className="flex items-center text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </button>
              </div>
              {formData.medicalHistory?.allergies.map((allergy, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={allergy}
                    onChange={(e) => handleMedicalHistoryChange('allergies', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="请输入过敏源"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicalHistoryItem('allergies', index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* 用药史 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">用药史</label>
                <button
                  type="button"
                  onClick={() => addMedicalHistoryItem('medications')}
                  className="flex items-center text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </button>
              </div>
              {formData.medicalHistory?.medications.map((medication, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => handleMedicalHistoryChange('medications', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="请输入药物名称"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicalHistoryItem('medications', index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* 疾病史 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">疾病史</label>
                <button
                  type="button"
                  onClick={() => addMedicalHistoryItem('conditions')}
                  className="flex items-center text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </button>
              </div>
              {formData.medicalHistory?.conditions.map((condition, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => handleMedicalHistoryChange('conditions', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="请输入疾病名称"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicalHistoryItem('conditions', index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '保存中...' : (pet ? '更新' : '添加')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PetForm;