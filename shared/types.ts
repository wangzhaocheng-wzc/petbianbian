// 共享类型定义

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
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
  externalId?: string;
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
  recordCount?: number;
  lastRecordDate?: Date;
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
  avatar?: string;
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
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: {
    shape: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6' | 'type7';
    healthStatus: 'healthy' | 'warning' | 'concerning';
    confidence: number;
    details: string;
    recommendations: string[];
    detectedFeatures: {
      color: string;
      texture: string;
      consistency: string;
      size: string;
    };
    shapeDescription?: string;
    healthStatusDescription?: string;
  };
  userNotes?: string;
  symptoms?: string[];
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  weather?: {
    temperature: number;
    humidity: number;
  };
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityPost {
  id: string;
  userId: string;
  petId?: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  category: 'health' | 'help' | 'experience' | 'general';
  status: 'published' | 'draft' | 'archived';
  isAnonymous: boolean; // 新增：是否匿名发布
  interactions: {
    likes: string[];
    views: number;
    shares: number;
  };
  comments: string[];
  isSticky: boolean;
  isFeatured: boolean;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  // 虚拟字段
  likesCount?: number;
  commentsCount?: number;
  // 填充字段
  user?: {
    id: string;
    username: string;
    avatar?: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
    stats?: {
      reputation: number;
    };
  };
  pet?: {
    id: string;
    name: string;
    type: string;
    avatar?: string;
    breed?: string;
    age?: number;
    weight?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  likes: string[];
  isDeleted: boolean;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  // 虚拟字段
  likesCount?: number;
  replies?: Comment[];
  // 填充字段
  user?: {
    id: string;
    username: string;
    avatar?: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthAnalysis {
  shape: string;
  healthStatus: 'healthy' | 'warning' | 'concerning';
  description: string;
  recommendations: string[];
}

// 分析相关的API类型
export interface AnalysisRequest {
  petId: string;
  notes?: string;
  symptoms?: string;
}

export interface AnalysisResponse {
  success: boolean;
  message: string;
  data?: PoopRecord;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface AnalysisRecordsResponse {
  success: boolean;
  message?: string;
  data?: {
    records: PoopRecord[];
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
      healthyPercentage: number;
      warningPercentage: number;
      concerningPercentage: number;
      averagePerWeek: number;
    };
  };
}

export interface AnalysisStatisticsResponse {
  success: boolean;
  message?: string;
  data?: {
    period: string;
    days: number;
    totalAnalysis: number;
    healthyPercentage: number;
    warningPercentage: number;
    concerningPercentage: number;
    averagePerWeek: number;
    trends: Array<{
      date: string;
      healthy: number;
      warning: number;
      concerning: number;
      total: number;
    }>;
    healthAssessment: {
      currentStatus: string;
      trend: 'improving' | 'stable' | 'declining';
      riskLevel: 'low' | 'medium' | 'high';
      urgency: 'none' | 'monitor' | 'consult' | 'urgent';
      lastAnalysis: Date;
      totalRecords: number;
      recommendations: string[];
    };
    lastUpdated: Date;
  };
}
// 社区相关的API类型
export interface CreatePostRequest {
  title: string;
  content: string;
  petId?: string;
  images?: string[];
  tags?: string[];
  category?: 'health' | 'help' | 'experience' | 'general';
  isAnonymous?: boolean; // 新增：是否匿名发布，默认为false
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  images?: string[];
  tags?: string[];
  category?: 'health' | 'help' | 'experience' | 'general';
  isAnonymous?: boolean; // 新增：是否匿名发布
}

export interface PostsListRequest {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  search?: string;
  sort?: 'latest' | 'popular' | 'views' | 'comments';
}

export interface PostsListResponse {
  success: boolean;
  message?: string;
  data?: {
    posts: CommunityPost[];
    pagination: {
      current: number;
      total: number;
      pageSize: number;
      totalItems: number;
    };
    categories: Array<{
      name: string;
      label: string;
      count: number;
    }>;
  };
}

export interface PostResponse {
  success: boolean;
  message?: string;
  data?: CommunityPost;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface CommentsListResponse {
  success: boolean;
  message?: string;
  data?: {
    comments: Comment[];
    pagination: {
      current: number;
      total: number;
      pageSize: number;
      totalItems: number;
    };
  };
}

export interface CommentResponse {
  success: boolean;
  message?: string;
  data?: Comment;
}

export interface LikeResponse {
  success: boolean;
  message?: string;
  data?: {
    isLiked: boolean;
    likesCount: number;
  };
}

// 内容审核相关类型
export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'violence' | 'hate_speech' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewerId?: string;
  reviewNotes?: string;
  action?: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
  // 填充字段
  reporter?: {
    id: string;
    username: string;
    avatar?: string;
  };
  reviewer?: {
    id: string;
    username: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'length' | 'frequency' | 'custom';
  config: {
    keywords?: string[];
    patterns?: string[];
    minLength?: number;
    maxLength?: number;
    maxFrequency?: number;
    timeWindow?: number;
    customScript?: string;
  };
  action: 'flag' | 'auto_reject' | 'require_approval' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  appliesTo: ('post' | 'comment')[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 审核相关的API类型
export interface CreateReportRequest {
  targetType: 'post' | 'comment';
  targetId: string;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'violence' | 'hate_speech' | 'misinformation' | 'other';
  description?: string;
}

export interface ProcessReportRequest {
  action: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
  reviewNotes?: string;
}

export interface CreateModerationRuleRequest {
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'length' | 'frequency' | 'custom';
  config: {
    keywords?: string[];
    patterns?: string[];
    minLength?: number;
    maxLength?: number;
    maxFrequency?: number;
    timeWindow?: number;
    customScript?: string;
  };
  action: 'flag' | 'auto_reject' | 'require_approval' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  appliesTo: ('post' | 'comment')[];
}

export interface ReportsListResponse {
  success: boolean;
  message?: string;
  data?: {
    reports: ContentReport[];
    pagination: {
      current: number;
      total: number;
      pageSize: number;
      totalItems: number;
    };
  };
}

export interface ModerationRulesResponse {
  success: boolean;
  message?: string;
  data?: {
    rules: ModerationRule[];
    pagination: {
      current: number;
      total: number;
      pageSize: number;
      totalItems: number;
    };
  };
}

export interface ModerationStatsResponse {
  success: boolean;
  message?: string;
  data?: {
    reports: {
      pending?: number;
      reviewing?: number;
      resolved?: number;
      dismissed?: number;
    };
    pendingContent: {
      posts: number;
      comments: number;
    };
  };
}

export interface ContentModerationTestResponse {
  success: boolean;
  message?: string;
  data?: {
    isAllowed: boolean;
    action: 'approve' | 'flag' | 'reject' | 'require_approval';
    severity: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    triggeredRules: string[];
  };
}