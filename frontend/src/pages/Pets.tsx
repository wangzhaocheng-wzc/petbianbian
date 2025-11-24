import React, { useEffect, useState } from 'react';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { Pet } from '../../../shared/types';
import { usePets } from '../hooks/usePets';
import PetCard from '../components/PetCard';
import PetForm from '../components/PetForm';

const Pets: React.FC = () => {
  const { pets, loading, error, createPet, updatePet, deletePet, clearError } = usePets();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Pet | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 过滤宠物列表
  const filteredPets = pets.filter(pet =>
    pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddPet = () => {
    setEditingPet(null);
    setIsFormOpen(true);
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setIsFormOpen(true);
  };

  const handleDeletePet = (pet: Pet) => {
    setDeleteConfirm(pet);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deletePet(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    let ok = false;
    if (editingPet) {
      ok = await updatePet(editingPet.id, data);
    } else {
      ok = await createPet(data);
    }
    if (ok) {
      setSuccessMessage(editingPet ? '宠物信息更新成功' : '宠物添加成功');
    }
    return ok;
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPet(null);
  };

  // 成功提示自动消失
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">我的宠物</h1>
              <p className="mt-2 text-gray-600">管理您的宠物信息，记录它们的健康状况</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleAddPet}
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                添加宠物
              </button>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索宠物名称或品种..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={clearError}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 成功提示 */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-700">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 宠物列表 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        ) : filteredPets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? '没有找到匹配的宠物' : '还没有添加宠物'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? '尝试使用其他关键词搜索' : '添加您的第一只宠物，开始记录它们的健康状况'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddPet}
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                添加宠物
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={handleEditPet}
                onDelete={handleDeletePet}
              />
            ))}
          </div>
        )}

        {/* 宠物表单模态框 */}
        <PetForm
          pet={editingPet}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          loading={loading}
        />

        {/* 删除确认模态框 */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
              </div>
              <p className="text-gray-600 mb-6">
                您确定要删除宠物 <strong>{deleteConfirm.name}</strong> 吗？此操作无法撤销。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pets;