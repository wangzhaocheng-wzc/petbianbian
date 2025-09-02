import api from './api';

export interface PetComparisonData {
  petId: string;
  petName: string;
  petType: string;
  breed?: string;
  age?: number;
  weight?: number;
  avatar?: string;
  statistics: {
    totalRecords: number;
    healthyCount: number;
    warningCount: number;
    concerningCount: number;
    healthyPercentage: number;
    warningPercentage: number;
    concerningPercentage: number;
    averagePerWeek: number;
    lastAnalysisDate?: Date;
  };
  trends: Array<{
    date: string;
    healthy: number;
    warning: number;
    concerning: number;
    total: number;
  }>;
  shapeDistribution: Array<{
    shape: string;
    count: number;
    percentage: number;
  }>;
}

export interface ComparisonAnalysis {
  pets: PetComparisonData[];
  comparison: {
    healthiestPet: {
      petId: string;
      petName: string;
      healthyPercentage: number;
    };
    mostConcerningPet: {
      petId: string;
      petName: string;
      concerningPercentage: number;
    };
    averageHealthPercentage: number;
    totalRecordsCompared: number;
    comparisonPeriod: {
      startDate: Date;
      endDate: Date;
      days: number;
    };
  };
  insights: string[];
  recommendations: string[];
}

export interface PetForComparison {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  weight?: number;
  avatar?: string;
  recordCount: number;
  lastRecordDate?: Date;
  createdAt: Date;
}

export interface HealthTrendsComparison {
  trends: Array<{
    date: string;
    pets: Array<{
      petId: string;
      petName: string;
      healthy: number;
      warning: number;
      concerning: number;
      total: number;
      healthPercentage: number;
    }>;
  }>;
  summary: {
    totalDays: number;
    petsCompared: number;
    averageHealthTrend: 'improving' | 'stable' | 'declining';
  };
}

class ComparisonService {
  /**
   * 获取用户所有宠物的基本信息（用于选择对比宠物）
   */
  async getPetsForComparison(): Promise<PetForComparison[]> {
    try {
      const response = await api.get('/comparison/pets');
      return response.data.data.pets;
    } catch (error) {
      console.error('获取宠物列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取多宠物对比分析
   */
  async getMultiPetComparison(
    petIds: string[],
    days: number = 30
  ): Promise<ComparisonAnalysis> {
    try {
      if (petIds.length < 2) {
        throw new Error('至少需要选择2个宠物进行对比');
      }

      if (petIds.length > 5) {
        throw new Error('最多只能同时对比5个宠物');
      }

      const response = await api.get('/comparison/multi-pet', {
        params: {
          petIds: petIds.join(','),
          days
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('获取多宠物对比分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取宠物健康趋势对比
   */
  async getPetHealthTrends(
    petIds: string[],
    days: number = 30
  ): Promise<HealthTrendsComparison> {
    try {
      if (petIds.length < 2) {
        throw new Error('至少需要选择2个宠物进行趋势对比');
      }

      const response = await api.get('/comparison/trends', {
        params: {
          petIds: petIds.join(','),
          days
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('获取宠物健康趋势对比失败:', error);
      throw error;
    }
  }

  /**
   * 获取健康状态的中文描述
   */
  getHealthStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      healthy: '健康',
      warning: '警告',
      concerning: '异常'
    };
    return statusMap[status] || status;
  }

  /**
   * 获取健康状态的颜色
   */
  getHealthStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      healthy: '#10B981', // green-500
      warning: '#F59E0B', // amber-500
      concerning: '#EF4444' // red-500
    };
    return colorMap[status] || '#6B7280';
  }

  /**
   * 获取便便形状的中文描述
   */
  getShapeDescription(shape: string): string {
    const shapeMap: Record<string, string> = {
      type1: '第1型 - 硬球状',
      type2: '第2型 - 块状',
      type3: '第3型 - 裂纹香肠状',
      type4: '第4型 - 光滑香肠状',
      type5: '第5型 - 软块状',
      type6: '第6型 - 糊状',
      type7: '第7型 - 水状'
    };
    return shapeMap[shape] || shape;
  }

  /**
   * 获取宠物类型的中文描述
   */
  getPetTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      dog: '狗狗',
      cat: '猫咪',
      other: '其他'
    };
    return typeMap[type] || type;
  }

  /**
   * 格式化年龄显示
   */
  formatAge(ageInMonths?: number): string {
    if (!ageInMonths) return '未知';
    
    if (ageInMonths < 12) {
      return `${ageInMonths}个月`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      if (months === 0) {
        return `${years}岁`;
      } else {
        return `${years}岁${months}个月`;
      }
    }
  }

  /**
   * 格式化体重显示
   */
  formatWeight(weight?: number): string {
    if (!weight) return '未知';
    return `${weight}kg`;
  }

  /**
   * 计算健康趋势
   */
  calculateHealthTrend(trends: Array<{ date: string; healthy: number; warning: number; concerning: number; total: number }>): 'improving' | 'stable' | 'declining' {
    if (trends.length < 7) return 'stable';

    const recentWeek = trends.slice(-7);
    const earlierWeek = trends.slice(-14, -7);

    if (recentWeek.length === 0 || earlierWeek.length === 0) return 'stable';

    const recentHealthPercentage = recentWeek.reduce((sum, day) => {
      return sum + (day.total > 0 ? (day.healthy / day.total) * 100 : 0);
    }, 0) / recentWeek.length;

    const earlierHealthPercentage = earlierWeek.reduce((sum, day) => {
      return sum + (day.total > 0 ? (day.healthy / day.total) * 100 : 0);
    }, 0) / earlierWeek.length;

    const difference = recentHealthPercentage - earlierHealthPercentage;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * 获取趋势的中文描述
   */
  getTrendText(trend: 'improving' | 'stable' | 'declining'): string {
    const trendMap: Record<string, string> = {
      improving: '改善中',
      stable: '稳定',
      declining: '下降中'
    };
    return trendMap[trend] || trend;
  }

  /**
   * 获取趋势的颜色
   */
  getTrendColor(trend: 'improving' | 'stable' | 'declining'): string {
    const colorMap: Record<string, string> = {
      improving: '#10B981', // green-500
      stable: '#6B7280', // gray-500
      declining: '#EF4444' // red-500
    };
    return colorMap[trend] || '#6B7280';
  }
}

export default new ComparisonService();