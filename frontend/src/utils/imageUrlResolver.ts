import { API_BASE_URL } from '@/utils/constants';

const PLACEHOLDER = '/pwa-192x192.png';

// 简单LRU缓存实现（最多500条）
class SimpleLRU<K, V> {
  private map = new Map<K, V>();
  private order: K[] = [];
  constructor(private limit = 500) {}
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // 触发最近使用更新
    this.order = this.order.filter(k => k !== key);
    this.order.push(key);
    return this.map.get(key);
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.set(key, value);
      this.order = this.order.filter(k => k !== key);
      this.order.push(key);
      return;
    }
    this.map.set(key, value);
    this.order.push(key);
    if (this.order.length > this.limit) {
      const oldest = this.order.shift();
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}

const cache = new SimpleLRU<string, string>(500);

function getBackendOrigin(): string {
  // API_BASE_URL 形如 http://localhost:5003/api
  return API_BASE_URL.replace(/\/api$/, '');
}

type RewriteReason =
  | 'port_rewrite'
  | 'relative_to_absolute'
  | 'uploads_prefix_added'
  | 'protocol_normalized'
  | 'none'
  | 'invalid';

function reportRewrite(original: string, resolved: string, reason: RewriteReason) {
  try {
    const payload = {
      timestamp: Date.now(),
      original,
      resolved,
      reason,
      frontendOrigin: window.location.origin,
      backendOrigin: getBackendOrigin(),
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    // 公共监控端点，不需认证头
    navigator.sendBeacon(`${getBackendOrigin()}/api/monitoring/image-url-rewrite`, blob);
  } catch {
    // 静默失败，避免影响用户体验
  }
}

export function resolveImageUrl(raw?: string | null): string {
  const original = (raw || '').trim();
  if (!original) return PLACEHOLDER;

  const cached = cache.get(original);
  if (cached) return cached;

  const backendOrigin = getBackendOrigin();
  let resolved = original;
  let reason: RewriteReason = 'none';

  try {
    // 完整URL
    if (/^https?:\/\//i.test(original)) {
      const url = new URL(original);
      // 本地历史记录的端口重写到当前后端端口
      const backendUrl = new URL(backendOrigin);
      if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port !== backendUrl.port) {
        url.protocol = backendUrl.protocol;
        url.host = backendUrl.host;
        resolved = url.toString();
        reason = 'port_rewrite';
      } else {
        resolved = original; // 保持CDN或正确域名
      }
    } else if (/^\/\//.test(original)) {
      // 协议相对URL
      resolved = `${window.location.protocol}${original}`;
      reason = 'protocol_normalized';
    } else if (/^\/uploads\//.test(original)) {
      // 绝对相对路径（带/uploads前缀）
      resolved = `${backendOrigin}${original}`;
      reason = 'relative_to_absolute';
    } else if (/^uploads\//.test(original)) {
      // 相对路径，补全为后端origin
      resolved = `${backendOrigin}/${original}`;
      reason = 'relative_to_absolute';
    } else if (/^(analysis|avatars|community)\//.test(original)) {
      // 历史中仅存储子目录，补全/uploads
      resolved = `${backendOrigin}/uploads/${original}`;
      reason = 'uploads_prefix_added';
    } else if (!original.includes('/')) {
      // 仅文件名，默认归入分析目录
      resolved = `${backendOrigin}/uploads/analysis/${original}`;
      reason = 'uploads_prefix_added';
    } else if (/^\//.test(original)) {
      // 其他以/开头但非/uploads的情况，尝试按静态资源处理
      resolved = `${backendOrigin}${original}`;
      reason = 'relative_to_absolute';
    } else {
      // 无法识别的格式，尝试按相对路径处理
      resolved = `${backendOrigin}/${original}`;
      reason = 'relative_to_absolute';
    }
  } catch {
    resolved = PLACEHOLDER;
    reason = 'invalid';
  }

  cache.set(original, resolved);
  if (reason !== 'none') reportRewrite(original, resolved, reason);
  return resolved;
}

export const ImageUrlResolver = {
  resolve: resolveImageUrl,
  placeholder: PLACEHOLDER,
};