import { TestResult } from '@playwright/test/reporter';

export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  rootCause: string;
  impact: string;
  resolution: string[];
  confidence: number;
}

export enum ErrorCategory {
  INFRASTRUCTURE = 'infrastructure',
  APPLICATION = 'application',
  TEST_CODE = 'test_code',
  ENVIRONMENT = 'environment',
  DATA = 'data',
  TIMING = 'timing',
  BROWSER = 'browser',
  NETWORK = 'network'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  evidencePoints: string[];
  similarIssues: string[];
  preventionMeasures: string[];
}

export interface ErrorTrend {
  errorType: string;
  occurrences: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  firstSeen: string;
  lastSeen: string;
  affectedTests: string[];
}

export class ErrorClassifier {
  private classificationRules: ClassificationRule[];
  private historicalData: Map<string, ErrorTrend>;

  constructor() {
    this.classificationRules = this.initializeClassificationRules();
    this.historicalData = new Map();
  }

  /**
   * 分类错误并进行根因分析
   */
  classifyError(testResult: TestResult): ErrorClassification {
    const errorMessage = testResult.error?.message || '';
    const stackTrace = testResult.error?.stack || '';
    const testTitle = testResult.title;

    // 应用分类规则
    const classification = this.applyClassificationRules(errorMessage, stackTrace, testTitle);
    
    // 进行根因分析
    const rootCauseAnalysis = this.performRootCauseAnalysis(errorMessage, stackTrace, classification);
    
    return {
      category: classification.category,
      severity: classification.severity,
      rootCause: rootCauseAnalysis.primaryCause,
      impact: this.assessImpact(classification.category, classification.severity),
      resolution: rootCauseAnalysis.preventionMeasures,
      confidence: classification.confidence
    };
  }

  /**
   * 初始化分类规则
   */
  private initializeClassificationRules(): ClassificationRule[] {
    return [
      // 网络相关错误
      {
        patterns: [/net::ERR_/, /NetworkError/, /fetch.*failed/, /Connection.*refused/i],
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        confidence: 0.9,
        rootCauses: ['网络连接不稳定', '服务器不可达', 'DNS解析失败', '防火墙阻止']
      },
      
      // 超时错误
      {
        patterns: [/timeout/i, /Timeout.*exceeded/i, /waiting.*timed out/i],
        category: ErrorCategory.TIMING,
        severity: ErrorSeverity.MEDIUM,
        confidence: 0.8,
        rootCauses: ['页面加载缓慢', '网络延迟', '服务器响应慢', '等待条件不准确']
      },
      
      // 元素定位错误
      {
        patterns: [/locator.*not found/i, /element.*not found/i, /selector.*not found/i],
        category: ErrorCategory.TEST_CODE,
        severity: ErrorSeverity.MEDIUM,
        confidence: 0.85,
        rootCauses: ['页面结构变更', '选择器不准确', '元素加载时机问题', '动态内容未等待']
      },
      
      // JavaScript运行时错误
      {
        patterns: [/ReferenceError/, /TypeError/, /SyntaxError/, /is not defined/],
        category: ErrorCategory.APPLICATION,
        severity: ErrorSeverity.HIGH,
        confidence: 0.9,
        rootCauses: ['应用代码错误', '依赖库缺失', '变量未定义', '函数调用错误']
      },
      
      // 断言失败
      {
        patterns: [/expect.*to.*but/i, /assertion.*failed/i, /expected.*actual/i],
        category: ErrorCategory.TEST_CODE,
        severity: ErrorSeverity.MEDIUM,
        confidence: 0.7,
        rootCauses: ['测试期望不正确', '应用行为变更', '测试数据问题', '时序问题']
      },
      
      // 页面导航错误
      {
        patterns: [/navigation.*failed/i, /page.*not.*loaded/i, /route.*not.*found/i],
        category: ErrorCategory.APPLICATION,
        severity: ErrorSeverity.HIGH,
        confidence: 0.8,
        rootCauses: ['路由配置错误', '页面不存在', '权限问题', '服务器错误']
      },
      
      // 浏览器相关错误
      {
        patterns: [/browser.*crashed/i, /browser.*disconnected/i, /session.*terminated/i],
        category: ErrorCategory.BROWSER,
        severity: ErrorSeverity.CRITICAL,
        confidence: 0.95,
        rootCauses: ['浏览器崩溃', '内存不足', '驱动程序问题', '系统资源耗尽']
      },
      
      // 环境相关错误
      {
        patterns: [/ECONNREFUSED/, /ENOTFOUND/, /permission.*denied/i, /access.*denied/i],
        category: ErrorCategory.ENVIRONMENT,
        severity: ErrorSeverity.HIGH,
        confidence: 0.85,
        rootCauses: ['服务未启动', '端口被占用', '权限不足', '环境配置错误']
      },
      
      // 数据相关错误
      {
        patterns: [/data.*not.*found/i, /invalid.*data/i, /database.*error/i],
        category: ErrorCategory.DATA,
        severity: ErrorSeverity.MEDIUM,
        confidence: 0.75,
        rootCauses: ['测试数据缺失', '数据格式错误', '数据库连接问题', '数据同步问题']
      }
    ];
  }

  /**
   * 应用分类规则
   */
  private applyClassificationRules(errorMessage: string, stackTrace: string, testTitle: string): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    confidence: number;
  } {
    const fullText = `${errorMessage} ${stackTrace} ${testTitle}`.toLowerCase();
    
    for (const rule of this.classificationRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(fullText)) {
          return {
            category: rule.category,
            severity: rule.severity,
            confidence: rule.confidence
          };
        }
      }
    }
    
    // 默认分类
    return {
      category: ErrorCategory.APPLICATION,
      severity: ErrorSeverity.MEDIUM,
      confidence: 0.5
    };
  }

  /**
   * 执行根因分析
   */
  private performRootCauseAnalysis(
    errorMessage: string, 
    stackTrace: string, 
    classification: { category: ErrorCategory; severity: ErrorSeverity; confidence: number }
  ): RootCauseAnalysis {
    const fullText = `${errorMessage} ${stackTrace}`.toLowerCase();
    
    // 找到匹配的规则
    const matchingRule = this.classificationRules.find(rule => 
      rule.category === classification.category &&
      rule.patterns.some(pattern => pattern.test(fullText))
    );
    
    const rootCauses = matchingRule?.rootCauses || ['未知原因'];
    const primaryCause = rootCauses[0];
    const contributingFactors = rootCauses.slice(1);
    
    // 提取证据点
    const evidencePoints = this.extractEvidencePoints(errorMessage, stackTrace);
    
    // 查找相似问题
    const similarIssues = this.findSimilarIssues(errorMessage, classification.category);
    
    // 生成预防措施
    const preventionMeasures = this.generatePreventionMeasures(classification.category, primaryCause);
    
    return {
      primaryCause,
      contributingFactors,
      evidencePoints,
      similarIssues,
      preventionMeasures
    };
  }

  /**
   * 提取证据点
   */
  private extractEvidencePoints(errorMessage: string, stackTrace: string): string[] {
    const evidencePoints: string[] = [];
    
    // 从错误消息中提取关键信息
    const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      evidencePoints.push(`相关URL: ${urlMatch[0]}`);
    }
    
    const statusMatch = errorMessage.match(/status\s*:?\s*(\d+)/i);
    if (statusMatch) {
      evidencePoints.push(`HTTP状态码: ${statusMatch[1]}`);
    }
    
    const timeoutMatch = errorMessage.match(/(\d+)ms/);
    if (timeoutMatch) {
      evidencePoints.push(`超时时间: ${timeoutMatch[1]}ms`);
    }
    
    // 从堆栈跟踪中提取文件信息
    const fileMatches = stackTrace.match(/at\s+.*\(([^)]+)\)/g);
    if (fileMatches) {
      const files = fileMatches.slice(0, 3).map(match => {
        const fileMatch = match.match(/\(([^)]+)\)/);
        return fileMatch ? fileMatch[1] : '';
      }).filter(Boolean);
      
      if (files.length > 0) {
        evidencePoints.push(`相关文件: ${files.join(', ')}`);
      }
    }
    
    return evidencePoints;
  }

  /**
   * 查找相似问题
   */
  private findSimilarIssues(errorMessage: string, category: ErrorCategory): string[] {
    // 这里可以实现基于历史数据的相似问题查找
    // 目前返回基于分类的通用相似问题
    const similarIssuesByCategory: Record<ErrorCategory, string[]> = {
      [ErrorCategory.NETWORK]: [
        '网络连接间歇性中断',
        'API服务不稳定',
        'CDN资源加载失败'
      ],
      [ErrorCategory.TIMING]: [
        '页面加载时间过长',
        '异步操作未完成',
        '动画效果干扰测试'
      ],
      [ErrorCategory.TEST_CODE]: [
        '选择器策略不当',
        '测试步骤顺序问题',
        '等待条件设置错误'
      ],
      [ErrorCategory.APPLICATION]: [
        '应用逻辑错误',
        '前端框架更新',
        '第三方库兼容性问题'
      ],
      [ErrorCategory.BROWSER]: [
        '浏览器版本兼容性',
        '内存泄漏导致崩溃',
        '扩展程序干扰'
      ],
      [ErrorCategory.ENVIRONMENT]: [
        '测试环境配置不一致',
        '依赖服务未启动',
        '系统资源不足'
      ],
      [ErrorCategory.DATA]: [
        '测试数据污染',
        '数据库状态不一致',
        '缓存数据过期'
      ],
      [ErrorCategory.INFRASTRUCTURE]: [
        '服务器硬件故障',
        '网络基础设施问题',
        '负载均衡配置错误'
      ]
    };
    
    return similarIssuesByCategory[category] || [];
  }

  /**
   * 生成预防措施
   */
  private generatePreventionMeasures(category: ErrorCategory, primaryCause: string): string[] {
    const preventionMeasuresByCategory: Record<ErrorCategory, string[]> = {
      [ErrorCategory.NETWORK]: [
        '实现网络请求重试机制',
        '添加网络状态检查',
        '使用网络模拟工具测试',
        '监控API服务可用性'
      ],
      [ErrorCategory.TIMING]: [
        '使用智能等待策略',
        '增加合理的超时时间',
        '实现条件等待',
        '优化页面加载性能'
      ],
      [ErrorCategory.TEST_CODE]: [
        '使用更稳定的选择器',
        '实现页面对象模式',
        '添加元素存在性检查',
        '改进测试数据管理'
      ],
      [ErrorCategory.APPLICATION]: [
        '加强代码审查',
        '增加单元测试覆盖',
        '实现错误监控',
        '建立回归测试套件'
      ],
      [ErrorCategory.BROWSER]: [
        '定期更新浏览器版本',
        '监控内存使用情况',
        '使用无头模式减少资源消耗',
        '实现浏览器重启机制'
      ],
      [ErrorCategory.ENVIRONMENT]: [
        '标准化测试环境配置',
        '实现环境健康检查',
        '使用容器化部署',
        '建立环境监控告警'
      ],
      [ErrorCategory.DATA]: [
        '实现测试数据隔离',
        '建立数据清理机制',
        '使用数据工厂模式',
        '实现数据一致性检查'
      ],
      [ErrorCategory.INFRASTRUCTURE]: [
        '实现基础设施监控',
        '建立故障转移机制',
        '定期进行容量规划',
        '实现自动化运维'
      ]
    };
    
    return preventionMeasuresByCategory[category] || [
      '详细分析错误日志',
      '联系相关技术团队',
      '建立问题跟踪机制',
      '定期回顾和改进'
    ];
  }

  /**
   * 评估影响程度
   */
  private assessImpact(category: ErrorCategory, severity: ErrorSeverity): string {
    const impactMatrix: Record<ErrorCategory, Record<ErrorSeverity, string>> = {
      [ErrorCategory.CRITICAL]: {
        [ErrorSeverity.CRITICAL]: '严重影响测试执行，可能导致整个测试套件失败',
        [ErrorSeverity.HIGH]: '显著影响测试可靠性，需要立即处理',
        [ErrorSeverity.MEDIUM]: '中等影响，可能导致测试不稳定',
        [ErrorSeverity.LOW]: '轻微影响，建议在下次迭代中修复'
      },
      [ErrorCategory.NETWORK]: {
        [ErrorSeverity.CRITICAL]: '网络问题导致测试完全无法执行',
        [ErrorSeverity.HIGH]: '网络不稳定严重影响测试结果',
        [ErrorSeverity.MEDIUM]: '偶发网络问题影响测试稳定性',
        [ErrorSeverity.LOW]: '轻微网络延迟，影响较小'
      },
      [ErrorCategory.APPLICATION]: {
        [ErrorSeverity.CRITICAL]: '应用严重错误，影响核心功能测试',
        [ErrorSeverity.HIGH]: '应用错误影响重要功能验证',
        [ErrorSeverity.MEDIUM]: '应用问题影响部分测试用例',
        [ErrorSeverity.LOW]: '轻微应用问题，影响有限'
      },
      [ErrorCategory.TEST_CODE]: {
        [ErrorSeverity.CRITICAL]: '测试代码严重错误，无法正常执行',
        [ErrorSeverity.HIGH]: '测试代码问题导致误报或漏报',
        [ErrorSeverity.MEDIUM]: '测试代码需要改进以提高稳定性',
        [ErrorSeverity.LOW]: '测试代码优化建议'
      },
      [ErrorCategory.ENVIRONMENT]: {
        [ErrorSeverity.CRITICAL]: '环境问题导致测试无法启动',
        [ErrorSeverity.HIGH]: '环境配置错误影响测试准确性',
        [ErrorSeverity.MEDIUM]: '环境不一致可能导致测试差异',
        [ErrorSeverity.LOW]: '环境优化建议'
      },
      [ErrorCategory.DATA]: {
        [ErrorSeverity.CRITICAL]: '数据问题导致测试完全失效',
        [ErrorSeverity.HIGH]: '数据不一致严重影响测试结果',
        [ErrorSeverity.MEDIUM]: '数据问题影响部分测试场景',
        [ErrorSeverity.LOW]: '数据优化建议'
      },
      [ErrorCategory.TIMING]: {
        [ErrorSeverity.CRITICAL]: '时序问题导致测试大量失败',
        [ErrorSeverity.HIGH]: '时序不当影响测试稳定性',
        [ErrorSeverity.MEDIUM]: '偶发时序问题需要优化',
        [ErrorSeverity.LOW]: '时序优化建议'
      },
      [ErrorCategory.BROWSER]: {
        [ErrorSeverity.CRITICAL]: '浏览器问题导致测试无法执行',
        [ErrorSeverity.HIGH]: '浏览器兼容性严重影响测试',
        [ErrorSeverity.MEDIUM]: '浏览器问题影响部分功能测试',
        [ErrorSeverity.LOW]: '浏览器优化建议'
      },
      [ErrorCategory.INFRASTRUCTURE]: {
        [ErrorSeverity.CRITICAL]: '基础设施故障导致测试中断',
        [ErrorSeverity.HIGH]: '基础设施问题严重影响测试',
        [ErrorSeverity.MEDIUM]: '基础设施不稳定影响测试质量',
        [ErrorSeverity.LOW]: '基础设施优化建议'
      }
    };
    
    return impactMatrix[category]?.[severity] || '影响程度待评估';
  }

  /**
   * 更新错误趋势数据
   */
  updateErrorTrends(testResults: TestResult[]): void {
    const currentTime = new Date().toISOString();
    
    testResults.filter(r => r.status === 'failed').forEach(result => {
      const errorMessage = result.error?.message || '';
      const classification = this.classifyError(result);
      const errorType = `${classification.category}-${classification.rootCause}`;
      
      if (this.historicalData.has(errorType)) {
        const trend = this.historicalData.get(errorType)!;
        trend.occurrences++;
        trend.lastSeen = currentTime;
        trend.affectedTests.push(result.title);
      } else {
        this.historicalData.set(errorType, {
          errorType,
          occurrences: 1,
          trend: 'stable',
          firstSeen: currentTime,
          lastSeen: currentTime,
          affectedTests: [result.title]
        });
      }
    });
  }

  /**
   * 获取错误趋势报告
   */
  getErrorTrends(): ErrorTrend[] {
    return Array.from(this.historicalData.values())
      .sort((a, b) => b.occurrences - a.occurrences);
  }
}

interface ClassificationRule {
  patterns: RegExp[];
  category: ErrorCategory;
  severity: ErrorSeverity;
  confidence: number;
  rootCauses: string[];
}