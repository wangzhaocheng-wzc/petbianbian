import { useState, useEffect } from 'react';
import { Pet, CreatePetRequest, UpdatePetRequest } from '../../../shared/types';
import { petService } from '../services/petService';

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
        setPets(response.data.pets);
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
        setPets(prev => [response.data!, ...prev]);
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
        setPets(prev => prev.map(pet => 
          pet.id === petId ? response.data! : pet
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