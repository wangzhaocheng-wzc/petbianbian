import mongoose from 'mongoose';
import ModerationRule, { IModerationRule } from '../models/ModerationRule';
import ContentReport, { IContentReport } from '../models/ContentReport';
import CommunityPost from '../models/CommunityPost';
import Comment from '../models/Comment';
import { Logger } from '../utils/logger';

export interface ModerationResult {
  isAllowed: boolean;
  action: 'approve' | 'flag' | 'reject' | 'require_approval';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  triggeredRules: string[];
}

export interface ContentAnalysis {
  content: string;
  type: 'post' | 'comment';
  userId: mongoose.Types.ObjectId;
  metadata?: {
    title?: string;
    tags?: string[];
    images?: string[];
  };
}

class ModerationService {
  private sensitiveWords: Set<string> = new Set();
  private patterns: RegExp[] = [];
  private rules: IModerationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.loadRules();
  }

  // 初始化默认敏感词和规则
  private initializeDefaultRules() {
    // 基础敏感词库
    const defaultSensitiveWords = [
      // 垃圾信息
      '广告', '推广', '加微信', '加QQ', '代理', '兼职', '赚钱', '投资', '理财',
      // 不当内容
      '色情', '暴力', '血腥', '恐怖', '自杀', '毒品', '赌博',
      // 仇恨言论
      '歧视', '种族主义', '性别歧视', '地域歧视',
      // 欺诈信息
      '诈骗', '虚假', '假冒', '盗版', '侵权'
    ];

    defaultSensitiveWords.forEach(word => this.sensitiveWords.add(word));

    // 默认正则模式
    this.patterns = [
      /\b(?:https?:\/\/|www\.)\S+/gi, // URL链接
      /\b\d{11}\b/g, // 手机号
      /\b\d{6,10}\b/g, // QQ号
      /微信号?[:：]\s*\w+/gi, // 微信号
      /[￥$]\d+/g, // 价格信息
      /[\u4e00-\u9fa5]{2,}(?:群|代理|加盟|招聘)/g // 可疑商业信息
    ];
  }

  // 从数据库加载审核规则
  async loadRules() {
    try {
      this.rules = await ModerationRule.find({ isActive: true }).sort({ severity: -1, createdAt: -1 });
      
      // 更新敏感词库
      this.sensitiveWords.clear();
      this.patterns = [];

      for (const rule of this.rules) {
        if (rule.type === 'keyword' && rule.config.keywords) {
          rule.config.keywords.forEach(keyword => this.sensitiveWords.add(keyword));
        }
        
        if (rule.type === 'pattern' && rule.config.patterns) {
          rule.config.patterns.forEach(pattern => {
            try {
              this.patterns.push(new RegExp(pattern, 'gi'));
            } catch (error) {
              Logger.error(`Invalid regex pattern: ${pattern}`, error);
            }
          });
        }
      }

      Logger.info(`Loaded ${this.rules.length} moderation rules`);
    } catch (error) {
      Logger.error('Failed to load moderation rules:', error);
    }
  }

  // 分析内容
  async analyzeContent(analysis: ContentAnalysis): Promise<ModerationResult> {
    const result: ModerationResult = {
      isAllowed: true,
      action: 'approve',
      severity: 'low',
      reasons: [],
      triggeredRules: []
    };

    try {
      // 检查敏感词
      const keywordResult = this.checkKeywords(analysis.content);
      if (keywordResult.violations.length > 0) {
        result.reasons.push(...keywordResult.violations);
        result.triggeredRules.push('keyword_filter');
        this.updateResult(result, 'medium', 'flag');
      }

      // 检查正则模式
      const patternResult = this.checkPatterns(analysis.content);
      if (patternResult.violations.length > 0) {
        result.reasons.push(...patternResult.violations);
        result.triggeredRules.push('pattern_filter');
        this.updateResult(result, 'medium', 'flag');
      }

      // 检查内容长度
      const lengthResult = this.checkLength(analysis.content, analysis.type);
      if (lengthResult.violation) {
        result.reasons.push(lengthResult.violation);
        result.triggeredRules.push('length_filter');
        this.updateResult(result, 'low', 'flag');
      }

      // 检查发布频率
      const frequencyResult = await this.checkFrequency(analysis.userId, analysis.type);
      if (frequencyResult.violation) {
        result.reasons.push(frequencyResult.violation);
        result.triggeredRules.push('frequency_filter');
        this.updateResult(result, 'high', 'require_approval');
      }

      // 应用自定义规则
      await this.applyCustomRules(analysis, result);

      // 根据严重程度决定最终动作
      if (result.severity === 'critical') {
        result.isAllowed = false;
        result.action = 'reject';
      } else if (result.severity === 'high') {
        result.isAllowed = false;
        result.action = 'require_approval';
      } else if (result.severity === 'medium') {
        result.isAllowed = true;
        result.action = 'flag';
      }

    } catch (error) {
      Logger.error('Content analysis failed:', error);
      // 出错时采用保守策略
      result.isAllowed = false;
      result.action = 'require_approval';
      result.reasons.push('系统错误，需要人工审核');
    }

    return result;
  }

  // 检查敏感词
  private checkKeywords(content: string): { violations: string[] } {
    const violations: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const word of this.sensitiveWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        violations.push(`包含敏感词: ${word}`);
      }
    }

    return { violations };
  }

  // 检查正则模式
  private checkPatterns(content: string): { violations: string[] } {
    const violations: string[] = [];

    for (const pattern of this.patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        violations.push(`匹配可疑模式: ${matches[0]}`);
      }
    }

    return { violations };
  }

  // 检查内容长度
  private checkLength(content: string, type: 'post' | 'comment'): { violation?: string } {
    const minLength = type === 'post' ? 10 : 1;
    const maxLength = type === 'post' ? 10000 : 2000;

    if (content.length < minLength) {
      return { violation: `内容过短，至少需要${minLength}个字符` };
    }

    if (content.length > maxLength) {
      return { violation: `内容过长，最多允许${maxLength}个字符` };
    }

    return {};
  }

  // 检查发布频率
  private async checkFrequency(userId: mongoose.Types.ObjectId, type: 'post' | 'comment'): Promise<{ violation?: string }> {
    try {
      const timeWindow = 10; // 10分钟
      const maxFrequency = type === 'post' ? 3 : 10; // 帖子3个，评论10个
      const since = new Date(Date.now() - timeWindow * 60 * 1000);

      let count = 0;
      if (type === 'post') {
        count = await CommunityPost.countDocuments({
          userId,
          createdAt: { $gte: since }
        });
      } else {
        count = await Comment.countDocuments({
          userId,
          createdAt: { $gte: since }
        });
      }

      if (count >= maxFrequency) {
        return { violation: `发布过于频繁，${timeWindow}分钟内最多发布${maxFrequency}个${type === 'post' ? '帖子' : '评论'}` };
      }

      return {};
    } catch (error) {
      Logger.error('Frequency check failed:', error);
      return {};
    }
  }

  // 应用自定义规则
  private async applyCustomRules(analysis: ContentAnalysis, result: ModerationResult) {
    const customRules = this.rules.filter(rule => 
      rule.type === 'custom' && 
      rule.appliesTo.includes(analysis.type)
    );

    for (const rule of customRules) {
      try {
        // 这里可以实现自定义脚本执行
        // 为了安全起见，暂时跳过自定义脚本执行
        Logger.info(`Skipping custom rule: ${rule.name}`);
      } catch (error) {
        Logger.error(`Custom rule execution failed: ${rule.name}`, error);
      }
    }
  }

  // 更新结果
  private updateResult(result: ModerationResult, severity: 'low' | 'medium' | 'high' | 'critical', action: 'approve' | 'flag' | 'reject' | 'require_approval') {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    
    if (severityLevels[severity] > severityLevels[result.severity]) {
      result.severity = severity;
      result.action = action;
    }
  }

  // 创建举报
  async createReport(reportData: {
    reporterId: mongoose.Types.ObjectId;
    targetType: 'post' | 'comment';
    targetId: mongoose.Types.ObjectId;
    reason: string;
    description?: string;
  }): Promise<IContentReport> {
    try {
      // 检查是否已经举报过
      const existingReport = await ContentReport.findOne({
        reporterId: reportData.reporterId,
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        status: { $in: ['pending', 'reviewing'] }
      });

      if (existingReport) {
        throw new Error('您已经举报过此内容，请等待处理结果');
      }

      const report = new ContentReport(reportData);
      await report.save();

      Logger.info(`New content report created: ${report._id}`);
      return report;
    } catch (error) {
      Logger.error('Failed to create content report:', error);
      throw error;
    }
  }

  // 处理举报
  async processReport(reportId: string, reviewerId: mongoose.Types.ObjectId, action: string, reviewNotes?: string): Promise<IContentReport> {
    try {
      const report = await ContentReport.findById(reportId);
      if (!report) {
        throw new Error('举报记录不存在');
      }

      // 分配审核员
      report.reviewerId = reviewerId;
      report.status = 'reviewing';
      
      // 完成审核
      report.action = action as any;
      report.reviewNotes = reviewNotes;
      report.status = action === 'none' ? 'dismissed' : 'resolved';
      
      await report.save();

      // 根据处理结果执行相应动作
      await this.executeAction(report, action);

      Logger.info(`Content report processed: ${reportId}, action: ${action}`);
      return report;
    } catch (error) {
      Logger.error('Failed to process content report:', error);
      throw error;
    }
  }

  // 执行审核动作
  private async executeAction(report: IContentReport, action: string) {
    try {
      switch (action) {
        case 'content_removed':
          await this.removeContent(report.targetType, report.targetId);
          break;
        case 'user_suspended':
          // TODO: 实现用户暂停功能
          Logger.info(`User suspension not implemented for report: ${report._id}`);
          break;
        case 'user_banned':
          // TODO: 实现用户封禁功能
          Logger.info(`User ban not implemented for report: ${report._id}`);
          break;
        case 'warning':
          // TODO: 实现用户警告功能
          Logger.info(`User warning not implemented for report: ${report._id}`);
          break;
        default:
          // 无动作
          break;
      }
    } catch (error) {
      Logger.error('Failed to execute moderation action:', error);
    }
  }

  // 移除内容
  private async removeContent(targetType: 'post' | 'comment', targetId: mongoose.Types.ObjectId) {
    try {
      if (targetType === 'post') {
        await CommunityPost.findByIdAndUpdate(targetId, {
          status: 'archived',
          moderationStatus: 'rejected'
        });
      } else {
        await Comment.findByIdAndUpdate(targetId, {
          isDeleted: true,
          moderationStatus: 'rejected'
        });
      }
      Logger.info(`Content removed: ${targetType} ${targetId}`);
    } catch (error) {
      Logger.error('Failed to remove content:', error);
    }
  }

  // 获取审核统计
  async getModerationStats(timeRange: 'day' | 'week' | 'month' = 'week') {
    try {
      const now = new Date();
      let since: Date;

      switch (timeRange) {
        case 'day':
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const [reportStats, contentStats] = await Promise.all([
        ContentReport.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Promise.all([
          CommunityPost.countDocuments({
            createdAt: { $gte: since },
            moderationStatus: 'pending'
          }),
          Comment.countDocuments({
            createdAt: { $gte: since },
            moderationStatus: 'pending'
          })
        ])
      ]);

      return {
        reports: reportStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        pendingContent: {
          posts: contentStats[0],
          comments: contentStats[1]
        }
      };
    } catch (error) {
      Logger.error('Failed to get moderation stats:', error);
      throw error;
    }
  }
}

export default ModerationService;