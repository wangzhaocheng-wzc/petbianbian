"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notificationService_1 = require("../services/notificationService");
const logger_1 = require("../utils/logger");
const express_validator_1 = require("express-validator");
class NotificationController {
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
            const userId = req.user?.id;
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
            const notification = await notificationService_1.NotificationService.createNotification(notificationData);
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
            const userId = req.user?.id;
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
            const result = await notificationService_1.NotificationService.getUserNotifications(userId, options);
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
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const result = await notificationService_1.NotificationService.getUserNotifications(userId, {
                status: 'unread',
                limit: 1
            });
            res.json({
                success: true,
                message: '获取未读通知数量成功',
                data: {
                    unreadCount: result.unreadCount
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
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { notificationId } = req.params;
            const success = await notificationService_1.NotificationService.markNotificationAsRead(notificationId, userId);
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
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { notificationIds } = req.body;
            const updatedCount = await notificationService_1.NotificationService.markNotificationsAsRead(notificationIds, userId);
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
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { notificationId } = req.params;
            const success = await notificationService_1.NotificationService.deleteNotification(notificationId, userId);
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
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { days = '30' } = req.query;
            const statistics = await notificationService_1.NotificationService.getNotificationStatistics(userId, parseInt(days));
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
            const userId = req.user?.id;
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
            const notification = await notificationService_1.NotificationService.createNotification(testNotification);
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
            const result = await notificationService_1.NotificationService.processPendingNotifications();
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
            const deletedCount = await notificationService_1.NotificationService.cleanupExpiredNotifications();
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
            const userId = req.user?.id;
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
            const userId = req.user?.id;
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