/**
 * 数据脱敏和匿名化工具
 * 用于处理真实数据转换为测试数据
 */

import * as crypto from 'crypto';

export interface AnonymizationConfig {
  fields: {
    [fieldName: string]: AnonymizationStrategy;
  };
  preserveStructure?: boolean;
  seedValue?: string;
}

export type AnonymizationStrategy = 
  | 'mask'           // 掩码处理
  | 'hash'           // 哈希处理
  | 'randomize'      // 随机化
  | 'truncate'       // 截断
  | 'replace'        // 替换
  | 'remove';        // 移除

export interface AnonymizationRule {
  strategy: AnonymizationStrategy;
  options?: {
    maskChar?: string;
    maskLength?: number;
    preserveLength?: boolean;
    replacement?: any;
    truncateLength?: number;
    hashAlgorithm?: string;
  };
}

export class DataAnonymizer {
  private seed: string;
  private rules: Map<string, AnonymizationRule> = new Map();

  constructor(seed: string = 'test-seed') {
    this.seed = seed;
    this.initializeDefaultRules();
  }

  /**
   * 匿名化单个对象
   */
  anonymize<T extends Record<string, any>>(data: T, config?: AnonymizationConfig): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const result = config?.preserveStructure ? { ...data } : {};
    const fieldsConfig = config?.fields || {};

    Object.entries(data).forEach(([key, value]) => {
      const strategy = fieldsConfig[key] || this.getDefaultStrategy(key);
      result[key] = this.applyAnonymization(value, strategy, key);
    });

    return result;
  }

  /**
   * 批量匿名化数组数据
   */
  anonymizeBatch<T extends Record<string, any>>(
    dataArray: T[], 
    config?: AnonymizationConfig
  ): T[] {
    return dataArray.map(item => this.anonymize(item, config));
  }

  /**
   * 添加自定义匿名化规则
   */
  addRule(fieldName: string, rule: AnonymizationRule): void {
    this.rules.set(fieldName, rule);
  }

  /**
   * 移除匿名化规则
   */
  removeRule(fieldName: string): void {
    this.rules.delete(fieldName);
  }

  /**
   * 获取所有规则
   */
  getRules(): Map<string, AnonymizationRule> {
    return new Map(this.rules);
  }

  /**
   * 邮箱匿名化
   */
  anonymizeEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }

    const [username, domain] = email.split('@');
    const maskedUsername = this.maskString(username, 2, 1);
    return `${maskedUsername}@${domain}`;
  }

  /**
   * 手机号匿名化
   */
  anonymizePhone(phone: string): string {
    if (!phone) return phone;
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) return phone;

    return cleanPhone.replace(/(\d{3})\d+(\d{4})/, '$1****$2');
  }

  /**
   * 姓名匿名化
   */
  anonymizeName(name: string): string {
    if (!name) return name;
    
    const parts = name.split(' ');
    return parts.map(part => {
      if (part.length <= 1) return part;
      return part[0] + '*'.repeat(part.length - 1);
    }).join(' ');
  }

  /**
   * 地址匿名化
   */
  anonymizeAddress(address: string): string {
    if (!address) return address;
    
    // 保留城市信息，匿名化详细地址
    const cityPattern = /(.*?[市县区])/;
    const match = address.match(cityPattern);
    
    if (match) {
      return match[1] + '***';
    }
    
    return '***';
  }

  /**
   * ID匿名化（保持格式但改变值）
   */
  anonymizeId(id: string): string {
    if (!id) return id;
    
    const hash = this.generateHash(id);
    return hash.substring(0, id.length);
  }

  /**
   * 数值数据匿名化（添加随机偏移）
   */
  anonymizeNumber(value: number, variance: number = 0.1): number {
    if (typeof value !== 'number') return value;
    
    const offset = (Math.random() - 0.5) * 2 * variance * value;
    return Math.round((value + offset) * 100) / 100;
  }

  /**
   * 日期匿名化（添加随机偏移）
   */
  anonymizeDate(date: Date | string, maxDaysOffset: number = 30): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return dateObj;
    }

    const offsetDays = (Math.random() - 0.5) * 2 * maxDaysOffset;
    const offsetMs = offsetDays * 24 * 60 * 60 * 1000;
    
    return new Date(dateObj.getTime() + offsetMs);
  }

  /**
   * 文本内容匿名化
   */
  anonymizeText(text: string, preserveLength: boolean = true): string {
    if (!text) return text;
    
    if (preserveLength) {
      return text.replace(/[a-zA-Z\u4e00-\u9fa5]/g, '*');
    }
    
    return '***';
  }

  /**
   * 生成一致性哈希（相同输入产生相同输出）
   */
  generateConsistentHash(input: string, length: number = 8): string {
    const hash = crypto.createHash('md5').update(input + this.seed).digest('hex');
    return hash.substring(0, length);
  }

  /**
   * 生成随机但一致的替换值
   */
  generateConsistentReplacement(input: string, type: 'email' | 'phone' | 'name'): string {
    const hash = this.generateConsistentHash(input);
    
    switch (type) {
      case 'email':
        return `user${hash}@test.com`;
      case 'phone':
        return `138${hash.substring(0, 8)}`;
      case 'name':
        return `测试用户${hash.substring(0, 4)}`;
      default:
        return hash;
    }
  }

  // 私有方法
  private initializeDefaultRules(): void {
    this.rules.set('email', { strategy: 'mask' });
    this.rules.set('phone', { strategy: 'mask' });
    this.rules.set('password', { strategy: 'replace', options: { replacement: '***' } });
    this.rules.set('name', { strategy: 'mask' });
    this.rules.set('username', { strategy: 'hash' });
    this.rules.set('address', { strategy: 'mask' });
    this.rules.set('id', { strategy: 'hash' });
  }

  private getDefaultStrategy(fieldName: string): AnonymizationStrategy {
    const rule = this.rules.get(fieldName);
    return rule?.strategy || 'mask';
  }

  private applyAnonymization(value: any, strategy: AnonymizationStrategy, fieldName: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    const rule = this.rules.get(fieldName);
    const options = rule?.options || {};

    switch (strategy) {
      case 'mask':
        return this.maskValue(value, options);
      case 'hash':
        return this.hashValue(value, options);
      case 'randomize':
        return this.randomizeValue(value, fieldName);
      case 'truncate':
        return this.truncateValue(value, options);
      case 'replace':
        return options.replacement || '***';
      case 'remove':
        return undefined;
      default:
        return value;
    }
  }

  private maskValue(value: any, options: any): any {
    if (typeof value === 'string') {
      const maskChar = options.maskChar || '*';
      const preserveLength = options.preserveLength !== false;
      
      if (value.includes('@')) {
        return this.anonymizeEmail(value);
      }
      
      if (/^\d+$/.test(value)) {
        return this.anonymizePhone(value);
      }
      
      return this.maskString(value, 1, 1, maskChar, preserveLength);
    }
    
    return value;
  }

  private hashValue(value: any, options: any): any {
    if (typeof value === 'string') {
      const algorithm = options.hashAlgorithm || 'md5';
      const length = options.preserveLength ? value.length : 8;
      return this.generateHash(value, algorithm).substring(0, length);
    }
    
    return value;
  }

  private randomizeValue(value: any, fieldName: string): any {
    if (typeof value === 'string') {
      if (value.includes('@')) {
        return this.generateConsistentReplacement(value, 'email');
      }
      if (/^\d+$/.test(value)) {
        return this.generateConsistentReplacement(value, 'phone');
      }
      return this.generateConsistentReplacement(value, 'name');
    }
    
    if (typeof value === 'number') {
      return this.anonymizeNumber(value);
    }
    
    return value;
  }

  private truncateValue(value: any, options: any): any {
    if (typeof value === 'string') {
      const length = options.truncateLength || 3;
      return value.substring(0, length) + '...';
    }
    
    return value;
  }

  private maskString(
    str: string, 
    prefixLength: number = 1, 
    suffixLength: number = 1, 
    maskChar: string = '*',
    preserveLength: boolean = true
  ): string {
    if (str.length <= prefixLength + suffixLength) {
      return preserveLength ? maskChar.repeat(str.length) : maskChar;
    }

    const prefix = str.substring(0, prefixLength);
    const suffix = str.substring(str.length - suffixLength);
    const maskLength = preserveLength ? str.length - prefixLength - suffixLength : 3;
    
    return prefix + maskChar.repeat(maskLength) + suffix;
  }

  private generateHash(input: string, algorithm: string = 'md5'): string {
    return crypto.createHash(algorithm).update(input + this.seed).digest('hex');
  }
}

// 导出默认实例
export const dataAnonymizer = new DataAnonymizer();

// 便捷函数
export const anonymizeUserData = (userData: any) => {
  return dataAnonymizer.anonymize(userData, {
    fields: {
      email: 'mask',
      phone: 'mask',
      password: 'replace',
      name: 'mask',
      address: 'mask'
    }
  });
};

export const anonymizePetData = (petData: any) => {
  return dataAnonymizer.anonymize(petData, {
    fields: {
      ownerId: 'hash',
      name: 'randomize'
    }
  });
};