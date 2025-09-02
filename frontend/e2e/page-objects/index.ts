/**
 * 页面对象模式导出文件
 * 统一导出所有页面对象类
 */

export { BasePage } from '../utils/base-page';
export { AuthPage } from './auth-page';
export { PetsPage } from './pets-page';
export { AnalysisPage } from './analysis-page';

// 类型定义
export interface UserData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms?: boolean;
}

export interface PetData {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age: number;
  weight: number;
  gender?: 'male' | 'female';
  birthdate?: string;
  description?: string;
  avatarPath?: string;
}

export interface AnalysisResult {
  status: string;
  score: string;
  description: string;
  confidence: string;
}

export interface AnalysisDetails {
  shape: string;
  color: string;
  consistency: string;
  size: string;
}