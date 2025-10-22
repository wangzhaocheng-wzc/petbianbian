"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notificationService_1 = require("../services/notificationService");
const logger_1 = require("../utils/logger");
const express_validator_1 = require("express-validator");
class NotificationController {
    // 动态选择底层服务，避免在未配置 Postgres 时模块加载即崩溃
    static async getBaseService() {
        if (process.env.DB_PRIMARY === 'postgres') {
            const { PGNotificationService } = await Promise.resolve().then(() => __importStar(require('../services/pgNotificationService')));
            return PGNotificationService;
        }
        return notificationService_1.NotificationService;
    }
    /**
     * 创建通知
     */
    static async createNotification(req, res) {
        try {
            // 验证输入
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: '输入验证失败',
                    errors: errors.array()
                });
                return;
            }
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const notificationData = {
                userId,
                ...req.body
            };
            const Service = await NotificationController.getBaseService();
            const notification = await Service.createNotification(notificationData);
            res.status(201).json({
                success: true,
                message: '通知创建成功',
                data: notification
            });
        }
        catch (error) {
            logger_1.Logger.error('创建通知失败:', error);
            res.status(500).json({
                success: false,
                message: '创建通知失败'
            });
        }
    }
    /**
     * 获取用户通知列表
     */
    static async getUserNotifications(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { status, type, category, priority, page = '1', limit = '20' } = req.query;
            const options = {
                status: status,
                type: type,
                category: category,
                priority: priority,
                page: parseInt(page),
                limit: parseInt(limit)
            };
            const Service = await NotificationController.getBaseService();
            const result = await Service.getUserNotifications(userId, options);
            res.json({
                success: true,
                message: '获取通知列表成功',
                data: result
            });
        }
        catch (error) {
            logger_1.Logger.error('获取通知列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取通知列表失败'
            });
        }
    }
    /**
     * 获取未读通知数量
     */
    static async getUnreadCount(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            let unreadCount = 0;
            const Base = await NotificationController.getBaseService();
            if (typeof Base.getUnreadCount === 'function') {
                unreadCount = await Base.getUnreadCount(userId);
            }
            else {
                const result = await notificationService_1.NotificationService.getUserNotifications(userId, {});
                unreadCount = result.unreadCount ?? 0;
            }
            res.json({
                success: true,
                message: '获取未读通知数量成功',
                data: {
                    unreadCount
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取未读通知数量失败:', error);
            res.status(500).json({
                success: false,
                message: '获取未读通知数量失败'
            });
        }
    }
    /**
     * 标记通知为已读
     */
    static async markAsRead(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { notificationId } = req.params;
            const Service = await NotificationController.getBaseService();
            const success = await Service.markNotificationAsRead(notificationId, userId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    message: '通知不存在'
                });
                return;
            }
            res.json({
                success: true,
                message: '通知已标记为已读'
            });
        }
        catch (error) {
            logger_1.Logger.error('标记通知为已读失败:', error);
            res.status(500).json({
                success: false,
                message: '标记通知为已读失败'
            });
        }
    }
    /**
     * 批量标记通知为已读
     */
    static async markMultipleAsRead(req, res) {
        try {
            // 验证输入
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: '输入验证失败',
                    errors: errors.array()
                });
                return;
            }
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { notificationIds } = req.body;
            const Service = await NotificationController.getBaseService();
            const updatedCount = await Service.markNotificationsAsRead(notificationIds, userId);
            res.json({
                success: true,
                message: '通知批量标记为已读成功',
                data: {
                    updatedCount
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('批量标记通知为已读失败:', error);
            res.status(500).json({
                success: false,
                message: '批量标记通知为已读失败'
            });
        }
    }
    /**
     * 删除通知
     */
    static async deleteNotification(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { notificationId } = req.params;
            const Service = await NotificationController.getBaseService();
            const success = await Service.deleteNotification(notificationId, userId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    message: '通知不存在'
                });
                return;
            }
            res.json({
                success: true,
                message: '通知删除成功'
            });
        }
        catch (error) {
            logger_1.Logger.error('删除通知失败:', error);
            res.status(500).json({
                success: false,
                message: '删除通知失败'
            });
        }
    }
    /**
     * 获取通知统计
     */
    static async getNotificationStatistics(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { days = '30' } = req.query;
            const Service = await NotificationController.getBaseService();
            const statistics = await Service.getNotificationStatistics(userId, parseInt(days));
            res.json({
                success: true,
                message: '获取通知统计成功',
                data: statistics
            });
        }
        catch (error) {
            logger_1.Logger.error('获取通知统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取通知统计失败'
            });
        }
    }
    /**
     * 发送测试通知
     */
    static async sendTestNotification(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const testNotification = {
                userId,
                type: 'system',
                category: 'general',
                title: '测试通知',
                message: '这是一条测试通知，用于验证通知系统是否正常工作。',
                priority: 'normal',
                channels: {
                    inApp: true,
                    email: req.body.includeEmail === true,
                    push: req.body.includePush === true
                }
            };
            const Service = await NotificationController.getBaseService();
            const notification = await Service.createNotification(testNotification);
            res.json({
                success: true,
                message: '测试通知发送成功',
                data: notification
            });
        }
        catch (error) {
            logger_1.Logger.error('发送测试通知失败:', error);
            res.status(500).json({
                success: false,
                message: '发送测试通知失败'
            });
        }
    }
    /**
     * 处理待发送通知（管理员功能）
     */
    static async processPendingNotifications(req, res) {
        try {
            // 这里应该添加管理员权限检查
            // if (!req.user?.isAdmin) { ... }
            const Base = await NotificationController.getBaseService();
            if (typeof Base.processPendingNotifications !== 'function') {
                res.status(501).json({ success: false, message: 'Postgres 模式下暂未实现该功能' });
                return;
            }
            const result = await Base.processPendingNotifications();
            res.json({
                success: true,
                message: '待发送通知处理完成',
                data: result
            });
        }
        catch (error) {
            logger_1.Logger.error('处理待发送通知失败:', error);
            res.status(500).json({
                success: false,
                message: '处理待发送通知失败'
            });
        }
    }
    /**
     * 清理过期通知（管理员功能）
     */
    static async cleanupExpiredNotifications(req, res) {
        try {
            // 这里应该添加管理员权限检查
            // if (!req.user?.isAdmin) { ... }
            const Base = await NotificationController.getBaseService();
            if (typeof Base.cleanupExpiredNotifications !== 'function') {
                res.status(501).json({ success: false, message: 'Postgres 模式下暂未实现该功能' });
                return;
            }
            const deletedCount = await Base.cleanupExpiredNotifications();
            res.json({
                success: true,
                message: '过期通知清理完成',
                data: {
                    deletedCount
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('清理过期通知失败:', error);
            res.status(500).json({
                success: false,
                message: '清理过期通知失败'
            });
        }
    }
    /**
     * 获取通知设置
     */
    static async getNotificationSettings(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            // 这里应该从用户设置中获取通知偏好
            // 暂时返回默认设置
            const settings = {
                inApp: {
                    enabled: true,
                    categories: {
                        health: true,
                        frequency: true,
                        pattern: true,
                        emergency: true,
                        general: true
                    }
                },
                email: {
                    enabled: true,
                    categories: {
                        health: true,
                        frequency: false,
                        pattern: true,
                        emergency: true,
                        general: false
                    },
                    frequency: 'immediate' // immediate, daily, weekly
                },
                push: {
                    enabled: false,
                    categories: {
                        health: true,
                        frequency: false,
                        pattern: false,
                        emergency: true,
                        general: false
                    }
                }
            };
            res.json({
                success: true,
                message: '获取通知设置成功',
                data: settings
            });
        }
        catch (error) {
            logger_1.Logger.error('获取通知设置失败:', error);
            res.status(500).json({
                success: false,
                message: '获取通知设置失败'
            });
        }
    }
    /**
     * 更新通知设置
     */
    static async updateNotificationSettings(req, res) {
        try {
            // 验证输入
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: '输入验证失败',
                    errors: errors.array()
                });
                return;
            }
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            // 这里应该更新用户的通知设置
            // 暂时返回成功响应
            const updatedSettings = req.body;
            res.json({
                success: true,
                message: '通知设置更新成功',
                data: updatedSettings
            });
        }
        catch (error) {
            logger_1.Logger.error('更新通知设置失败:', error);
            res.status(500).json({
                success: false,
                message: '更新通知设置失败'
            });
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notificationController.js.map