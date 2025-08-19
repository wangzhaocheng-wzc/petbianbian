// API基础URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// 路由路径
export const ROUTES = {
  HOME: '/',
  ANALYSIS: '/analysis',
  RECORDS: '/records',
  COMMUNITY: '/community',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  THEME: 'theme',
} as const;

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

// 便便类型映射
export const POOP_TYPE_LABELS = {
  type1: '硬球状（便秘）',
  type2: '块状（轻微便秘）',
  type3: '裂纹状（正常偏硬）',
  type4: '光滑软便（理想状态）',
  type5: '软块状（正常偏软）',
  type6: '糊状（轻微腹泻）',
  type7: '水状（腹泻）',
} as const;

// 健康状态映射
export const HEALTH_STATUS_LABELS = {
  healthy: '健康',
  warning: '需要关注',
  concerning: '需要就医',
} as const;

// 健康状态颜色
export const HEALTH_STATUS_COLORS = {
  healthy: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  concerning: 'text-red-600 bg-red-50',
} as const;

// 宠物类型标签
export const PET_TYPE_LABELS = {
  dog: '狗狗',
  cat: '猫咪',
  other: '其他',
} as const;

// 社区分类标签
export const CATEGORY_LABELS = {
  health: '健康分享',
  help: '求助问答',
  experience: '经验分享',
  general: '日常交流',
} as const;