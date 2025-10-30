import { useState, useEffect } from 'react';
import { Pet, CreatePetRequest, UpdatePetRequest } from '../../../shared/types';
import { petService } from '../services/petService';

// 统一处理后端返回的宠物对象，确保存在 id 字段
const normalizePet = (pet: any): Pet => {
  const id = pet?.id ?? pet?._id;
  // 保留原有字段，同时补充 id 字段
  return {
    ...pet,
    id,
    externalId: pet?.externalId ?? undefined,
  } as Pet;
};

export const usePets = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取宠物列表
  const fetchPets = async (isInitialLoad = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await petService.getPets(isInitialLoad);
      if (response.success && response.data) {
        const normalized = response.data.pets.map(normalizePet);
        setPets(normalized);
      } else {
        setError(response.message || '获取宠物列表失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '获取宠物列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建宠物
  const createPet = async (petData: CreatePetRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await petService.createPet(petData);
      if (response.success && response.data) {
        const created = normalizePet(response.data!);
        setPets(prev => [created, ...prev]);
        return true;
      } else {
        setError(response.message || '创建宠物失败');
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '创建宠物失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 更新宠物
  const updatePet = async (petId: string, petData: UpdatePetRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await petService.updatePet(petId, petData);
      if (response.success && response.data) {
        const updated = normalizePet(response.data!);
        setPets(prev => prev.map(pet => 
          (pet.id === petId || (pet as any)._id === petId) ? updated : pet
        ));
        return true;
      } else {
        setError(response.message || '更新宠物失败');
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '更新宠物失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 删除宠物
  const deletePet = async (petId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await petService.deletePet(petId);
      if (response.success) {
        setPets(prev => prev.filter(pet => pet.id !== petId));
        return true;
      } else {
        setError(response.message || '删除宠物失败');
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '删除宠物失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 初始化时获取宠物列表
  useEffect(() => {
    fetchPets(true); // 标记为初始化加载
  }, []);

  return {
    pets,
    loading,
    error,
    fetchPets,
    createPet,
    updatePet,
    deletePet,
    clearError: () => setError(null)
  };
};