import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { OfflineApiService, offlineApi, api } from '../offlineApi';
import { OfflineStorage, OfflineQueue } from '../../utils/offlineStorage';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

const mockedAxios = {
  get: vi.mocked(axios.get),
  post: vi.mocked(axios.post),
  put: vi.mocked(axios.put),
  delete: vi.mocked(axios.delete),
};

// Mock OfflineStorage and OfflineQueue
vi.mock('../../utils/offlineStorage', () => ({
  OfflineStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  OfflineQueue: {
    addToQueue: vi.fn(),
  },
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('OfflineApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigator.onLine = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OfflineApiService.getInstance();
      const instance2 = OfflineApiService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should export the same instance as offlineApi', () => {
      const instance = OfflineApiService.getInstance();
      expect(offlineApi).toBe(instance);
    });
  });

  describe('GET Requests', () => {
    it('should make successful GET request and cache response', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = { data: mockData };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      vi.mocked(OfflineStorage.setItem).mockResolvedValueOnce(true);
      
      const result = await offlineApi.get('/test');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/test', undefined);
      expect(OfflineStorage.setItem).toHaveBeenCalledWith(
        'get_/test_{}',
        mockData
      );
      expect(result).toEqual(mockData);
    });

    it('should make GET request with config and params', async () => {
      const mockData = { items: [] };
      const mockResponse = { data: mockData };
      const config = { params: { page: 1, limit: 10 } };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      vi.mocked(OfflineStorage.setItem).mockResolvedValueOnce(true);
      
      const result = await offlineApi.get('/items', config);
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/items', config);
      expect(OfflineStorage.setItem).toHaveBeenCalledWith(
        'get_/items_{"page":1,"limit":10}',
        mockData
      );
      expect(result).toEqual(mockData);
    });

    it('should return cached data when offline and cache exists', async () => {
      const cachedData = { id: 1, name: 'Cached' };
      
      navigator.onLine = false;
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(cachedData);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await offlineApi.get('/test');
      
      expect(OfflineStorage.getItem).toHaveBeenCalledWith('get_/test_{}');
      expect(result).toEqual(cachedData);
      expect(consoleSpy).toHaveBeenCalledWith('从缓存返回数据:', '/test');
      
      consoleSpy.mockRestore();
    });

    it('should throw error when offline and no cache exists', async () => {
      navigator.onLine = false;
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(null);
      
      await expect(offlineApi.get('/test')).rejects.toThrow('Network Error');
    });

    it('should throw error when online but request fails', async () => {
      navigator.onLine = true;
      mockedAxios.get.mockRejectedValueOnce(new Error('Server Error'));
      
      await expect(offlineApi.get('/test')).rejects.toThrow('Server Error');
    });
  });

  describe('POST Requests', () => {
    it('should make successful POST request', async () => {
      const postData = { name: 'New Item' };
      const mockResponse = { data: { id: 1, ...postData } };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await offlineApi.post('/items', postData);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/items', postData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should add to queue when offline', async () => {
      const postData = { name: 'Offline Item' };
      
      navigator.onLine = false;
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineQueue.addToQueue).mockReturnValueOnce(true);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await offlineApi.post('/items', postData);
      
      expect(OfflineQueue.addToQueue).toHaveBeenCalledWith({
        type: 'POST',
        url: '/api/items',
        method: 'POST',
        data: postData,
        timestamp: expect.any(Number)
      });
      expect(result).toEqual({ message: '请求已排队，将在网络恢复时处理' });
      expect(consoleSpy).toHaveBeenCalledWith('请求已添加到离线队列:', '/items');
      
      consoleSpy.mockRestore();
    });

    it('should throw error when offline and queue fails', async () => {
      const postData = { name: 'Failed Item' };
      
      navigator.onLine = false;
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineQueue.addToQueue).mockReturnValueOnce(false);
      
      await expect(offlineApi.post('/items', postData)).rejects.toThrow('Network Error');
    });
  });

  describe('PUT Requests', () => {
    it('should make successful PUT request', async () => {
      const putData = { id: 1, name: 'Updated Item' };
      const mockResponse = { data: putData };
      
      mockedAxios.put.mockResolvedValueOnce(mockResponse);
      
      const result = await offlineApi.put('/items/1', putData);
      
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/items/1', putData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should add to queue when offline', async () => {
      const putData = { id: 1, name: 'Offline Update' };
      
      navigator.onLine = false;
      mockedAxios.put.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineQueue.addToQueue).mockReturnValueOnce(true);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await offlineApi.put('/items/1', putData);
      
      expect(OfflineQueue.addToQueue).toHaveBeenCalledWith({
        type: 'PUT',
        url: '/api/items/1',
        method: 'PUT',
        data: putData,
        timestamp: expect.any(Number)
      });
      expect(result).toEqual({ message: '请求已排队，将在网络恢复时处理' });
      expect(consoleSpy).toHaveBeenCalledWith('PUT请求已添加到离线队列:', '/items/1');
      
      consoleSpy.mockRestore();
    });
  });

  describe('DELETE Requests', () => {
    it('should make successful DELETE request', async () => {
      const mockResponse = { data: { success: true } };
      
      mockedAxios.delete.mockResolvedValueOnce(mockResponse);
      
      const result = await offlineApi.delete('/items/1');
      
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/items/1', undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('should add to queue when offline', async () => {
      navigator.onLine = false;
      mockedAxios.delete.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineQueue.addToQueue).mockReturnValueOnce(true);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await offlineApi.delete('/items/1');
      
      expect(OfflineQueue.addToQueue).toHaveBeenCalledWith({
        type: 'DELETE',
        url: '/api/items/1',
        method: 'DELETE',
        timestamp: expect.any(Number)
      });
      expect(result).toEqual({ message: '请求已排队，将在网络恢复时处理' });
      expect(consoleSpy).toHaveBeenCalledWith('DELETE请求已添加到离线队列:', '/items/1');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Management', () => {
    it('should get cached data', () => {
      const cachedData = { id: 1, name: 'Cached' };
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(cachedData);
      
      const result = offlineApi.getCachedData('/test');
      
      expect(OfflineStorage.getItem).toHaveBeenCalledWith('get_/test_{}');
      expect(result).toEqual(cachedData);
    });

    it('should get cached data with params', () => {
      const cachedData = { items: [] };
      const params = { page: 1 };
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(cachedData);
      
      const result = offlineApi.getCachedData('/items', params);
      
      expect(OfflineStorage.getItem).toHaveBeenCalledWith('get_/items_{"page":1}');
      expect(result).toEqual(cachedData);
    });

    it('should clear specific cache', () => {
      vi.mocked(OfflineStorage.removeItem).mockReturnValueOnce(true);
      
      const result = offlineApi.clearCache('/test');
      
      expect(OfflineStorage.removeItem).toHaveBeenCalledWith('get_/test_{}');
      expect(result).toBe(true);
    });

    it('should clear specific cache with params', () => {
      const params = { page: 1 };
      vi.mocked(OfflineStorage.removeItem).mockReturnValueOnce(true);
      
      const result = offlineApi.clearCache('/items', params);
      
      expect(OfflineStorage.removeItem).toHaveBeenCalledWith('get_/items_{"page":1}');
      expect(result).toBe(true);
    });

    it('should clear all cache', () => {
      vi.mocked(OfflineStorage.clear).mockReturnValueOnce(true);
      
      const result = offlineApi.clearAllCache();
      
      expect(OfflineStorage.clear).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('API Convenience Methods', () => {
    it('should provide convenient api.get method', async () => {
      const mockData = { id: 1 };
      const mockResponse = { data: mockData };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      vi.mocked(OfflineStorage.setItem).mockResolvedValueOnce(true);
      
      const result = await api.get('/test');
      
      expect(result).toEqual(mockData);
    });

    it('should provide convenient api.post method', async () => {
      const postData = { name: 'Test' };
      const mockResponse = { data: { id: 1, ...postData } };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await api.post('/test', postData);
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should provide convenient api.put method', async () => {
      const putData = { id: 1, name: 'Updated' };
      const mockResponse = { data: putData };
      
      mockedAxios.put.mockResolvedValueOnce(mockResponse);
      
      const result = await api.put('/test/1', putData);
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should provide convenient api.delete method', async () => {
      const mockResponse = { data: { success: true } };
      
      mockedAxios.delete.mockResolvedValueOnce(mockResponse);
      
      const result = await api.delete('/test/1');
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should provide convenient cache methods', () => {
      const cachedData = { id: 1 };
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(cachedData);
      vi.mocked(OfflineStorage.removeItem).mockReturnValueOnce(true);
      vi.mocked(OfflineStorage.clear).mockReturnValueOnce(true);
      
      expect(api.getCached('/test')).toEqual(cachedData);
      expect(api.clearCache('/test')).toBe(true);
      expect(api.clearAllCache()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle axios errors properly', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Not Found' }
        }
      };
      
      mockedAxios.get.mockRejectedValueOnce(axiosError);
      
      await expect(offlineApi.get('/not-found')).rejects.toEqual(axiosError);
    });

    it('should handle network errors when online', async () => {
      const networkError = new Error('Network Error');
      
      navigator.onLine = true;
      mockedAxios.post.mockRejectedValueOnce(networkError);
      
      await expect(offlineApi.post('/test', {})).rejects.toThrow('Network Error');
    });

    it('should handle storage errors gracefully', async () => {
      const mockData = { id: 1 };
      const mockResponse = { data: mockData };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      vi.mocked(OfflineStorage.setItem).mockRejectedValueOnce(new Error('Storage Error'));
      
      // Should still return data even if caching fails
      const result = await offlineApi.get('/test');
      expect(result).toEqual(mockData);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle online to offline transition', async () => {
      // First request online - should succeed and cache
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = { data: mockData };
      
      navigator.onLine = true;
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      vi.mocked(OfflineStorage.setItem).mockResolvedValueOnce(true);
      
      const onlineResult = await offlineApi.get('/test');
      expect(onlineResult).toEqual(mockData);
      
      // Second request offline - should return cached data
      navigator.onLine = false;
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(mockData);
      
      const offlineResult = await offlineApi.get('/test');
      expect(offlineResult).toEqual(mockData);
    });

    it('should handle mixed online/offline operations', async () => {
      // GET request offline with cache
      navigator.onLine = false;
      const cachedData = { items: [{ id: 1 }] };
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineStorage.getItem).mockReturnValueOnce(cachedData);
      
      const getResult = await offlineApi.get('/items');
      expect(getResult).toEqual(cachedData);
      
      // POST request offline - should queue
      const postData = { name: 'New Item' };
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(OfflineQueue.addToQueue).mockReturnValueOnce(true);
      
      const postResult = await offlineApi.post('/items', postData);
      expect(postResult).toEqual({ message: '请求已排队，将在网络恢复时处理' });
    });
  });
});