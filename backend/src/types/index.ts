// 后端类型定义

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    location?: string;
    bio?: string;
  };
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    language: string;
  };
  stats: {
    totalAnalysis: number;
    totalPosts: number;
    reputation: number;
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 认证相关类型
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed?: string;
  gender?: 'male' | 'female';
  age?: number; // 年龄（月）
  weight?: number; // 体重（kg）
  avatar?: string;
  description?: string;
  medicalHistory?: {
    allergies: string[];
    medications: string[];
    conditions: string[];
  };
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 宠物相关的请求和响应类型
export interface CreatePetRequest {
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed?: string;
  gender?: 'male' | 'female';
  age?: number;
  weight?: number;
  description?: string;
  medicalHistory?: {
    allergies: string[];
    medications: string[];
    conditions: string[];
  };
}

export interface UpdatePetRequest extends Partial<CreatePetRequest> {}

export interface PetResponse {
  success: boolean;
  message?: string;
  data?: Pet;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PetsListResponse {
  success: boolean;
  message?: string;
  data?: {
    pets: Pet[];
    total: number;
  };
}

export interface PoopRecord {
  id: string;
  petId: string;
  imageUrl: string;
  shape: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6' | 'type7';
  healthStatus: 'healthy' | 'warning' | 'concerning';
  notes?: string;
  timestamp: Date;
  aiAnalysis?: {
    confidence: number;
    details: string;
  };
}

export interface CommunityPost {
  id: string;
  userId: string;
  petId?: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  likes: number;
  comments: Comment[];
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface HealthAnalysis {
  shape: string;
  healthStatus: 'healthy' | 'warning' | 'concerning';
  description: string;
  recommendations: string[];
}

// 文件上传相关类型
export interface FileUploadResponse {
  success: boolean;
  message: string;
  data?: {
    url: string;
    filename: string;
    size: number;
    mimetype: string;
  };
}

export interface MultipleFileUploadResponse {
  success: boolean;
  message: string;
  data?: {
    files: Array<{
      url: string;
      filename: string;
      originalName: string;
      size: number;
      mimetype: string;
    }>;
    count: number;
  };
}

// 分析相关类型
export interface AnalysisRequest {
  petId: string;
  notes?: string;
  symptoms?: string;
}

export interface AnalysisResult {
  id: string;
  petId: string;
  imageUrl: string;
  analysis: {
    shape: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6' | 'type7';
    healthStatus: 'healthy' | 'warning' | 'concerning';
    confidence: number;
    details: string;
    recommendations: string[];
  };
  userNotes: string;
  symptoms: string[];
  timestamp: Date;
  isShared: boolean;
}

export interface AnalysisRecordsResponse {
  success: boolean;
  data: {
    records: AnalysisResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    statistics: {
      totalRecords: number;
      healthyCount: number;
      warningCount: number;
      concerningCount: number;
      averagePerWeek: number;
    };
  };
}