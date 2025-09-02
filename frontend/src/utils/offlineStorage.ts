// 离线存储工具类
export class OfflineStorage {
  private static readonly STORAGE_KEY = 'pet-health-offline-data';
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB

  // 存储离线数据
  static async setItem(key: string, data: any): Promise<boolean> {
    try {
      const storageData = this.getStorageData();
      storageData[key] = {
        data,
        timestamp: Date.now(),
        size: JSON.stringify(data).length
      };

      // 检查存储大小
      const totalSize = this.calculateTotalSize(storageData);
      if (totalSize > this.MAX_STORAGE_SIZE) {
        // 清理旧数据
        this.cleanupOldData(storageData);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error('离线存储失败:', error);
      return false;
    }
  }

  // 获取离线数据
  static getItem<T>(key: string): T | null {
    try {
      const storageData = this.getStorageData();
      const item = storageData[key];
      
      if (!item) return null;

      // 检查数据是否过期（7天）
      const isExpired = Date.now() - item.timestamp > 7 * 24 * 60 * 60 * 1000;
      if (isExpired) {
        this.removeItem(key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.error('获取离线数据失败:', error);
      return null;
    }
  }

  // 删除离线数据
  static removeItem(key: string): boolean {
    try {
      const storageData = this.getStorageData();
      delete storageData[key];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error('删除离线数据失败:', error);
      return false;
    }
  }

  // 清空所有离线数据
  static clear(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清空离线数据失败:', error);
      return false;
    }
  }

  // 获取所有键
  static getKeys(): string[] {
    try {
      const storageData = this.getStorageData();
      return Object.keys(storageData);
    } catch (error) {
      console.error('获取离线数据键失败:', error);
      return [];
    }
  }

  // 获取存储使用情况
  static getStorageInfo() {
    try {
      const storageData = this.getStorageData();
      const totalSize = this.calculateTotalSize(storageData);
      const itemCount = Object.keys(storageData).length;
      
      return {
        totalSize,
        maxSize: this.MAX_STORAGE_SIZE,
        itemCount,
        usagePercentage: (totalSize / this.MAX_STORAGE_SIZE) * 100
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {
        totalSize: 0,
        maxSize: this.MAX_STORAGE_SIZE,
        itemCount: 0,
        usagePercentage: 0
      };
    }
  }

  // 私有方法：获取存储数据
  private static getStorageData(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('解析存储数据失败:', error);
      return {};
    }
  }

  // 私有方法：计算总存储大小
  private static calculateTotalSize(storageData: Record<string, any>): number {
    return Object.values(storageData).reduce((total: number, item: any) => {
      return total + (item.size || 0);
    }, 0);
  }

  // 私有方法：清理旧数据
  private static cleanupOldData(storageData: Record<string, any>): void {
    // 按时间戳排序，删除最旧的数据
    const sortedItems = Object.entries(storageData).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    // 删除最旧的25%数据
    const itemsToDelete = Math.ceil(sortedItems.length * 0.25);
    for (let i = 0; i < itemsToDelete; i++) {
      delete storageData[sortedItems[i][0]];
    }
  }
}

// 离线队列管理
export class OfflineQueue {
  private static readonly QUEUE_KEY = 'pet-health-offline-queue';

  // 添加到离线队列
  static addToQueue(action: {
    type: string;
    url: string;
    method: string;
    data?: any;
    timestamp: number;
  }): boolean {
    try {
      const queue = this.getQueue();
      queue.push(action);
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (error) {
      console.error('添加到离线队列失败:', error);
      return false;
    }
  }

  // 获取离线队列
  static getQueue(): any[] {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取离线队列失败:', error);
      return [];
    }
  }

  // 清空队列
  static clearQueue(): boolean {
    try {
      localStorage.removeItem(this.QUEUE_KEY);
      return true;
    } catch (error) {
      console.error('清空离线队列失败:', error);
      return false;
    }
  }

  // 处理队列中的请求
  static async processQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`处理 ${queue.length} 个离线请求`);

    for (const action of queue) {
      try {
        // 这里应该调用实际的API请求
        console.log('处理离线请求:', action);
        // await api.request(action);
      } catch (error) {
        console.error('处理离线请求失败:', error);
      }
    }

    // 处理完成后清空队列
    this.clearQueue();
  }
}