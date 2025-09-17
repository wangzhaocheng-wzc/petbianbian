import { apiClient } from './api';
import { Pet, CreatePetRequest, UpdatePetRequest, PetResponse, PetsListResponse } from '../../../shared/types';

export const petService = {
  // 获取用户的宠物列表
  getPets: async (isInitialLoad = false): Promise<PetsListResponse> => {
    const config = isInitialLoad ? {
      headers: { 'X-Init-Request': 'true' }
    } : {};
    return apiClient.get<{ pets: Pet[]; total: number }>('/pets', config);
  },

  // 获取特定宠物信息
  getPetById: async (petId: string): Promise<PetResponse> => {
    return apiClient.get<Pet>(`/pets/${petId}`);
  },

  // 创建新宠物
  createPet: async (petData: CreatePetRequest): Promise<PetResponse> => {
    return apiClient.post<Pet>('/pets', petData);
  },

  // 更新宠物信息
  updatePet: async (petId: string, petData: UpdatePetRequest): Promise<PetResponse> => {
    return apiClient.put<Pet>(`/pets/${petId}`, petData);
  },

  // 删除宠物
  deletePet: async (petId: string): Promise<{ success: boolean; message?: string }> => {
    return apiClient.delete(`/pets/${petId}`);
  },
};