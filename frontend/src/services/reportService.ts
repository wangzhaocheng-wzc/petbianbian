import api from './api';

export interface HealthReportData {
  pet: {
    id: string;
    name: string;
    type: string;
    breed?: string;
    age?: number;
    weight?: number;
    avatar?: string;
  };
  owner: {
    id: string;
    username: string;
    email: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  statistics: {
    totalRecords: number;
    healthyCount: number;
    warningCount: number;
    concerningCount: number;
    healthyPercentage: number;
    warningPercentage: number;
    concerningPercentage: number;
    averagePerWeek: number;
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
  recentRecords: Array<{
    id: string;
    timestamp: Date;
    healthStatus: string;
    shape: string;
    confidence: number;
    details: string;
    recommendations: string[];
  }>;
  healthAssessment: {
    currentStatus: string;
    trend: 'improving' | 'stable' | 'declining';
    riskLevel: 'low' | 'medium' | 'high';
    urgency: 'none' | 'monitor' | 'consult' | 'urgent';
    recommendations: string[];
  };
}

class ReportService {
  /**
   * 获取健康报告数据
   */
  async getHealthReportData(petId: string, days: number = 30): Promise<HealthReportData> {
    try {
      const response = await api.get(`/reports/health/${petId}`, {
        params: { days }
      });
      return response.data.data;
    } catch (error) {
      console.error('获取健康报告数据失败:', error);
      throw error;
    }
  }

  /**
   * 下载PDF健康报告
   */
  async downloadHealthReportPDF(petId: string, days: number = 30): Promise<void> {
    try {
      const response = await api.get(`/reports/health/${petId}/pdf`, {
        params: { days },
        responseType: 'blob'
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 从响应头获取文件名，如果没有则使用默认名称
      const contentDisposition = response.headers['content-disposition'];
      let filename = '健康报告.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载PDF健康报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成并保存PDF健康报告
   */
  async generateHealthReportPDF(petId: string, days: number = 30): Promise<{ filePath: string; downloadUrl: string }> {
    try {
      const response = await api.post(`/reports/health/${petId}/generate`, {}, {
        params: { days }
      });
      return response.data.data;
    } catch (error) {
      console.error('生成PDF健康报告失败:', error);
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

  /**
   * 获取风险等级的中文描述
   */
  getRiskLevelText(level: 'low' | 'medium' | 'high'): string {
    const levelMap: Record<string, string> = {
      low: '低风险',
      medium: '中等风险',
      high: '高风险'
    };
    return levelMap[level] || level;
  }

  /**
   * 获取风险等级的颜色
   */
  getRiskLevelColor(level: 'low' | 'medium' | 'high'): string {
    const colorMap: Record<string, string> = {
      low: '#10B981', // green-500
      medium: '#F59E0B', // amber-500
      high: '#EF4444' // red-500
    };
    return colorMap[level] || '#6B7280';
  }

  /**
   * 获取紧急程度的中文描述
   */
  getUrgencyText(urgency: 'none' | 'monitor' | 'consult' | 'urgent'): string {
    const urgencyMap: Record<string, string> = {
      none: '无需特殊关注',
      monitor: '需要监测',
      consult: '建议咨询兽医',
      urgent: '紧急就医'
    };
    return urgencyMap[urgency] || urgency;
  }

  /**
   * 获取紧急程度的颜色
   */
  getUrgencyColor(urgency: 'none' | 'monitor' | 'consult' | 'urgent'): string {
    const colorMap: Record<string, string> = {
      none: '#10B981', // green-500
      monitor: '#F59E0B', // amber-500
      consult: '#EF4444', // red-500
      urgent: '#DC2626' // red-600
    };
    return colorMap[urgency] || '#6B7280';
  }
}

export default new ReportService();