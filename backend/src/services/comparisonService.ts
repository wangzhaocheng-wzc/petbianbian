import mongoose from 'mongoose';
import { PoopRecord } from '../models/PoopRecord';
import Pet from '../models/Pet';

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

export class ComparisonService {
  /**
   * 获取多个宠物的对比分析数据
   */
  static async getMultiPetComparison(
    userId: string,
    petIds: string[],
    days: number = 30
  ): Promise<ComparisonAnalysis> {
    if (petIds.length < 2) {
      throw new Error('至少需要选择2个宠物进行对比');
    }

    if (petIds.length > 5) {
      throw new Error('最多只能同时对比5个宠物');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // 验证宠物所有权
    const pets = await Pet.find({
      _id: { $in: petIds.map(id => new mongoose.Types.ObjectId(id)) },
      ownerId: new mongoose.Types.ObjectId(userId),
      isActive: true
    });

    if (pets.length !== petIds.length) {
      throw new Error('部分宠物不存在或无权限访问');
    }

    // 获取每个宠物的数据
    const petComparisonData: PetComparisonData[] = [];
    
    for (const pet of pets) {
      const petData = await this.getPetComparisonData(pet._id.toString(), startDate, endDate);
      petComparisonData.push({
        petId: pet._id.toString(),
        petName: pet.name,
        petType: pet.type,
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight,
        avatar: pet.avatar,
        ...petData
      });
    }

    // 生成对比分析
    const comparison = this.generateComparisonAnalysis(petComparisonData, startDate, endDate, days);
    
    // 生成洞察和建议
    const insights = this.generateInsights(petComparisonData);
    const recommendations = this.generateRecommendations(petComparisonData);

    return {
      pets: petComparisonData,
      comparison,
      insights,
      recommendations
    };
  }

  /**
   * 获取单个宠物的对比数据
   */
  private static async getPetComparisonData(
    petId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Omit<PetComparisonData, 'petId' | 'petName' | 'petType' | 'breed' | 'age' | 'weight' | 'avatar'>> {
    const petObjectId = new mongoose.Types.ObjectId(petId);

    // 获取统计数据
    const statisticsResult = await PoopRecord.aggregate([
      {
        $match: {
          petId: petObjectId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$analysis.healthStatus',
          count: { $sum: 1 },
          lastDate: { $max: '$timestamp' }
        }
      }
    ]);

    const statistics = {
      totalRecords: 0,
      healthyCount: 0,
      warningCount: 0,
      concerningCount: 0,
      healthyPercentage: 0,
      warningPercentage: 0,
      concerningPercentage: 0,
      averagePerWeek: 0,
      lastAnalysisDate: undefined as Date | undefined
    };

    let lastAnalysisDate: Date | undefined;

    statisticsResult.forEach(result => {
      statistics.totalRecords += result.count;
      if (!lastAnalysisDate || result.lastDate > lastAnalysisDate) {
        lastAnalysisDate = result.lastDate;
      }
      
      switch (result._id) {
        case 'healthy':
          statistics.healthyCount = result.count;
          break;
        case 'warning':
          statistics.warningCount = result.count;
          break;
        case 'concerning':
          statistics.concerningCount = result.count;
          break;
      }
    });

    if (statistics.totalRecords > 0) {
      statistics.healthyPercentage = Math.round((statistics.healthyCount / statistics.totalRecords) * 100);
      statistics.warningPercentage = Math.round((statistics.warningCount / statistics.totalRecords) * 100);
      statistics.concerningPercentage = Math.round((statistics.concerningCount / statistics.totalRecords) * 100);
      
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = days / 7;
      statistics.averagePerWeek = Math.round((statistics.totalRecords / weeks) * 10) / 10;
    }

    statistics.lastAnalysisDate = lastAnalysisDate;

    // 获取趋势数据
    const trendsResult = await PoopRecord.aggregate([
      {
        $match: {
          petId: petObjectId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            healthStatus: '$analysis.healthStatus'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          healthy: {
            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'healthy'] }, '$count', 0] }
          },
          warning: {
            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'warning'] }, '$count', 0] }
          },
          concerning: {
            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'concerning'] }, '$count', 0] }
          }
        }
      },
      {
        $addFields: {
          total: { $add: ['$healthy', '$warning', '$concerning'] }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const trends = trendsResult.map(item => ({
      date: item._id,
      healthy: item.healthy,
      warning: item.warning,
      concerning: item.concerning,
      total: item.total
    }));

    // 获取形状分布
    const shapeDistributionResult = await PoopRecord.aggregate([
      {
        $match: {
          petId: petObjectId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$analysis.shape',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const shapeDistribution = shapeDistributionResult.map(item => ({
      shape: item._id,
      count: item.count,
      percentage: statistics.totalRecords > 0 ? Math.round((item.count / statistics.totalRecords) * 100) : 0
    }));

    return {
      statistics,
      trends,
      shapeDistribution
    };
  }

  /**
   * 生成对比分析结果
   */
  private static generateComparisonAnalysis(
    pets: PetComparisonData[],
    startDate: Date,
    endDate: Date,
    days: number
  ) {
    const healthiestPet = pets.reduce((prev, current) => 
      current.statistics.healthyPercentage > prev.statistics.healthyPercentage ? current : prev
    );

    const mostConcerningPet = pets.reduce((prev, current) => 
      current.statistics.concerningPercentage > prev.statistics.concerningPercentage ? current : prev
    );

    const totalRecords = pets.reduce((sum, pet) => sum + pet.statistics.totalRecords, 0);
    const totalHealthyRecords = pets.reduce((sum, pet) => sum + pet.statistics.healthyCount, 0);
    const averageHealthPercentage = totalRecords > 0 ? Math.round((totalHealthyRecords / totalRecords) * 100) : 0;

    return {
      healthiestPet: {
        petId: healthiestPet.petId,
        petName: healthiestPet.petName,
        healthyPercentage: healthiestPet.statistics.healthyPercentage
      },
      mostConcerningPet: {
        petId: mostConcerningPet.petId,
        petName: mostConcerningPet.petName,
        concerningPercentage: mostConcerningPet.statistics.concerningPercentage
      },
      averageHealthPercentage,
      totalRecordsCompared: totalRecords,
      comparisonPeriod: {
        startDate,
        endDate,
        days
      }
    };
  }

  /**
   * 生成洞察信息
   */
  private static generateInsights(pets: PetComparisonData[]): string[] {
    const insights: string[] = [];

    // 健康状况对比洞察
    const healthPercentages = pets.map(pet => pet.statistics.healthyPercentage);
    const maxHealth = Math.max(...healthPercentages);
    const minHealth = Math.min(...healthPercentages);
    const avgHealth = healthPercentages.reduce((sum, val) => sum + val, 0) / pets.length;

    if (maxHealth - minHealth > 30) {
      insights.push(`宠物间健康状况差异较大，最高健康率${maxHealth}%，最低${minHealth}%，建议关注健康状况较差的宠物`);
    } else if (avgHealth > 80) {
      insights.push(`所有宠物整体健康状况良好，平均健康率${Math.round(avgHealth)}%`);
    } else if (avgHealth < 60) {
      insights.push(`多个宠物健康状况需要关注，平均健康率仅${Math.round(avgHealth)}%，建议咨询兽医`);
    }

    // 年龄相关洞察
    const petsWithAge = pets.filter(pet => pet.age !== undefined);
    if (petsWithAge.length >= 2) {
      const olderPets = petsWithAge.filter(pet => pet.age! > 84); // 7岁以上
      const youngerPets = petsWithAge.filter(pet => pet.age! <= 84);
      
      if (olderPets.length > 0 && youngerPets.length > 0) {
        const olderAvgHealth = olderPets.reduce((sum, pet) => sum + pet.statistics.healthyPercentage, 0) / olderPets.length;
        const youngerAvgHealth = youngerPets.reduce((sum, pet) => sum + pet.statistics.healthyPercentage, 0) / youngerPets.length;
        
        if (olderAvgHealth < youngerAvgHealth - 15) {
          insights.push(`年龄较大的宠物健康状况相对较差，这是正常的老化现象，建议增加健康监测频率`);
        }
      }
    }

    // 品种相关洞察
    const breedGroups = pets.reduce((groups, pet) => {
      if (pet.breed) {
        if (!groups[pet.breed]) groups[pet.breed] = [];
        groups[pet.breed].push(pet);
      }
      return groups;
    }, {} as Record<string, PetComparisonData[]>);

    Object.entries(breedGroups).forEach(([breed, breedPets]) => {
      if (breedPets.length >= 2) {
        const avgHealth = breedPets.reduce((sum, pet) => sum + pet.statistics.healthyPercentage, 0) / breedPets.length;
        if (avgHealth < 60) {
          insights.push(`${breed}品种的宠物健康状况需要特别关注，可能存在品种相关的健康问题`);
        }
      }
    });

    // 记录频率洞察
    const recordFrequencies = pets.map(pet => pet.statistics.averagePerWeek);
    const maxFreq = Math.max(...recordFrequencies);
    const minFreq = Math.min(...recordFrequencies);

    if (maxFreq > minFreq * 2) {
      insights.push(`宠物间记录频率差异较大，建议保持相对一致的监测频率以获得更准确的健康评估`);
    }

    return insights;
  }

  /**
   * 生成建议信息
   */
  private static generateRecommendations(pets: PetComparisonData[]): string[] {
    const recommendations: string[] = [];

    // 基于健康状况的建议
    const concerningPets = pets.filter(pet => pet.statistics.concerningPercentage > 20);
    if (concerningPets.length > 0) {
      recommendations.push(`${concerningPets.map(pet => pet.petName).join('、')}的异常记录较多，建议尽快咨询兽医进行详细检查`);
    }

    const warningPets = pets.filter(pet => pet.statistics.warningPercentage > 30);
    if (warningPets.length > 0) {
      recommendations.push(`${warningPets.map(pet => pet.petName).join('、')}需要调整饮食或生活习惯，建议增加纤维摄入和运动量`);
    }

    // 基于记录频率的建议
    const lowFrequencyPets = pets.filter(pet => pet.statistics.averagePerWeek < 3);
    if (lowFrequencyPets.length > 0) {
      recommendations.push(`${lowFrequencyPets.map(pet => pet.petName).join('、')}的记录频率较低，建议增加监测频率以获得更准确的健康评估`);
    }

    // 基于年龄的建议
    const olderPets = pets.filter(pet => pet.age && pet.age > 84); // 7岁以上
    if (olderPets.length > 0) {
      recommendations.push(`${olderPets.map(pet => pet.petName).join('、')}年龄较大，建议定期体检并关注消化系统健康`);
    }

    // 通用建议
    if (pets.length >= 3) {
      recommendations.push('多宠物家庭建议建立统一的健康监测计划，确保每个宠物都得到充分关注');
    }

    recommendations.push('定期对比分析有助于及早发现健康问题，建议每月进行一次多宠物健康对比');

    return recommendations;
  }

  /**
   * 获取宠物健康趋势对比
   */
  static async getPetHealthTrends(
    userId: string,
    petIds: string[],
    days: number = 30
  ): Promise<{
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
  }> {
    if (petIds.length < 2) {
      throw new Error('至少需要选择2个宠物进行趋势对比');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 验证宠物所有权
    const pets = await Pet.find({
      _id: { $in: petIds.map(id => new mongoose.Types.ObjectId(id)) },
      ownerId: new mongoose.Types.ObjectId(userId),
      isActive: true
    });

    if (pets.length !== petIds.length) {
      throw new Error('部分宠物不存在或无权限访问');
    }

    // 获取所有宠物的趋势数据
    const allTrends = await PoopRecord.aggregate([
      {
        $match: {
          petId: { $in: pets.map(pet => pet._id) },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            petId: '$petId',
            healthStatus: '$analysis.healthStatus'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            date: '$_id.date',
            petId: '$_id.petId'
          },
          healthy: {
            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'healthy'] }, '$count', 0] }
          },
          warning: {
            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'warning'] }, '$count', 0] }
          },
          concerning: {
            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'concerning'] }, '$count', 0] }
          }
        }
      },
      {
        $addFields: {
          total: { $add: ['$healthy', '$warning', '$concerning'] },
          healthPercentage: {
            $cond: [
              { $gt: [{ $add: ['$healthy', '$warning', '$concerning'] }, 0] },
              {
                $multiply: [
                  { $divide: ['$healthy', { $add: ['$healthy', '$warning', '$concerning'] }] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.petId': 1 }
      }
    ]);

    // 组织数据按日期分组
    const trendsByDate = allTrends.reduce((acc, item) => {
      const date = item._id.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      
      const pet = pets.find(p => p._id.equals(item._id.petId));
      if (pet) {
        acc[date].push({
          petId: pet._id.toString(),
          petName: pet.name,
          healthy: item.healthy,
          warning: item.warning,
          concerning: item.concerning,
          total: item.total,
          healthPercentage: Math.round(item.healthPercentage)
        });
      }
      
      return acc;
    }, {} as Record<string, any[]>);

    // 转换为数组格式
    const trends = Object.entries(trendsByDate)
      .map(([date, pets]) => ({ date, pets }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 计算健康趋势
    let averageHealthTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (trends.length >= 7) {
      const recentWeek = trends.slice(-7);
      const earlierWeek = trends.slice(-14, -7);
      
      if (recentWeek.length > 0 && earlierWeek.length > 0) {
        const recentAvg = recentWeek.reduce((sum, day: any) => {
          const dayAvg = day.pets.reduce((petSum: number, pet: any) => petSum + pet.healthPercentage, 0) / day.pets.length;
          return sum + dayAvg;
        }, 0) / recentWeek.length;
        
        const earlierAvg = earlierWeek.reduce((sum, day: any) => {
          const dayAvg = day.pets.reduce((petSum: number, pet: any) => petSum + pet.healthPercentage, 0) / day.pets.length;
          return sum + dayAvg;
        }, 0) / earlierWeek.length;
        
        if (recentAvg > earlierAvg + 5) {
          averageHealthTrend = 'improving';
        } else if (recentAvg < earlierAvg - 5) {
          averageHealthTrend = 'declining';
        }
      }
    }

    return {
      trends: trends as any,
      summary: {
        totalDays: days,
        petsCompared: pets.length,
        averageHealthTrend
      }
    };
  }
}