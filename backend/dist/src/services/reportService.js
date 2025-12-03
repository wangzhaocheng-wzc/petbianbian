"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const PoopRecord_1 = require("../models/PoopRecord");
const Pet_1 = __importDefault(require("../models/Pet"));
const User_1 = __importDefault(require("../models/User"));
class ReportService {
    /**
     * 生成宠物健康报告数据
     */
    static async generateHealthReportData(userId, petId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const endDate = new Date();
        // 验证宠物所有权
        const pet = await Pet_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(petId),
            ownerId: new mongoose_1.default.Types.ObjectId(userId),
            isActive: true
        });
        if (!pet) {
            throw new Error('宠物不存在或无权限访问');
        }
        // 获取用户信息
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('用户不存在');
        }
        // 获取健康记录
        const records = await PoopRecord_1.PoopRecord.find({
            petId: new mongoose_1.default.Types.ObjectId(petId),
            timestamp: { $gte: startDate, $lte: endDate }
        }).sort({ timestamp: -1 });
        // 计算统计数据
        const statistics = this.calculateStatistics(records, days);
        // 计算趋势数据
        const trends = this.calculateTrends(records);
        // 计算形状分布
        const shapeDistribution = this.calculateShapeDistribution(records);
        // 获取最近记录
        const recentRecords = records.slice(0, 10).map(record => ({
            id: record._id.toString(),
            timestamp: record.timestamp,
            healthStatus: record.analysis.healthStatus,
            shape: record.analysis.shape,
            confidence: record.analysis.confidence,
            details: record.analysis.details,
            recommendations: record.analysis.recommendations
        }));
        // 生成健康评估
        const healthAssessment = this.generateHealthAssessment(records, statistics);
        return {
            pet: {
                id: pet._id.toString(),
                name: pet.name,
                type: pet.type,
                breed: pet.breed,
                age: pet.age,
                weight: pet.weight,
                avatar: pet.avatar
            },
            owner: {
                id: user._id.toString(),
                username: user.username,
                email: user.email
            },
            period: {
                startDate,
                endDate,
                days
            },
            statistics,
            trends,
            shapeDistribution,
            recentRecords,
            healthAssessment
        };
    } /*
  *
     * 计算统计数据
     */
    static calculateStatistics(records, days) {
        const statistics = {
            totalRecords: records.length,
            healthyCount: 0,
            warningCount: 0,
            concerningCount: 0,
            healthyPercentage: 0,
            warningPercentage: 0,
            concerningPercentage: 0,
            averagePerWeek: 0
        };
        records.forEach(record => {
            switch (record.analysis.healthStatus) {
                case 'healthy':
                    statistics.healthyCount++;
                    break;
                case 'warning':
                    statistics.warningCount++;
                    break;
                case 'concerning':
                    statistics.concerningCount++;
                    break;
            }
        });
        if (statistics.totalRecords > 0) {
            statistics.healthyPercentage = Math.round((statistics.healthyCount / statistics.totalRecords) * 100);
            statistics.warningPercentage = Math.round((statistics.warningCount / statistics.totalRecords) * 100);
            statistics.concerningPercentage = Math.round((statistics.concerningCount / statistics.totalRecords) * 100);
            const weeks = days / 7;
            statistics.averagePerWeek = Math.round((statistics.totalRecords / weeks) * 10) / 10;
        }
        return statistics;
    }
    /**
     * 计算趋势数据
     */
    static calculateTrends(records) {
        const trendMap = new Map();
        records.forEach(record => {
            const date = record.timestamp.toISOString().split('T')[0];
            if (!trendMap.has(date)) {
                trendMap.set(date, { healthy: 0, warning: 0, concerning: 0 });
            }
            const trend = trendMap.get(date);
            switch (record.analysis.healthStatus) {
                case 'healthy':
                    trend.healthy++;
                    break;
                case 'warning':
                    trend.warning++;
                    break;
                case 'concerning':
                    trend.concerning++;
                    break;
            }
        });
        return Array.from(trendMap.entries())
            .map(([date, data]) => ({
            date,
            healthy: data.healthy,
            warning: data.warning,
            concerning: data.concerning,
            total: data.healthy + data.warning + data.concerning
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    /**
     * 计算形状分布
     */
    static calculateShapeDistribution(records) {
        const shapeMap = new Map();
        records.forEach(record => {
            const shape = record.analysis.shape;
            shapeMap.set(shape, (shapeMap.get(shape) || 0) + 1);
        });
        const totalRecords = records.length;
        return Array.from(shapeMap.entries())
            .map(([shape, count]) => ({
            shape,
            count,
            percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0
        }))
            .sort((a, b) => a.shape.localeCompare(b.shape));
    }
    /**
     * 生成健康评估
     */
    static generateHealthAssessment(records, statistics) {
        let currentStatus = '健康';
        let trend = 'stable';
        let riskLevel = 'low';
        let urgency = 'none';
        const recommendations = [];
        // 评估当前状态
        if (statistics.concerningPercentage > 30) {
            currentStatus = '需要关注';
            riskLevel = 'high';
            urgency = 'consult';
        }
        else if (statistics.warningPercentage > 40) {
            currentStatus = '轻微异常';
            riskLevel = 'medium';
            urgency = 'monitor';
        }
        else if (statistics.healthyPercentage >= 80) {
            currentStatus = '健康良好';
            riskLevel = 'low';
            urgency = 'none';
        }
        // 评估趋势
        if (records.length >= 14) {
            const recentWeek = records.slice(0, 7);
            const previousWeek = records.slice(7, 14);
            const recentHealthy = recentWeek.filter(r => r.analysis.healthStatus === 'healthy').length;
            const previousHealthy = previousWeek.filter(r => r.analysis.healthStatus === 'healthy').length;
            if (recentHealthy > previousHealthy) {
                trend = 'improving';
            }
            else if (recentHealthy < previousHealthy) {
                trend = 'declining';
            }
        }
        // 生成建议
        if (statistics.concerningPercentage > 20) {
            recommendations.push('建议尽快咨询兽医，进行详细健康检查');
        }
        if (statistics.warningPercentage > 30) {
            recommendations.push('注意调整宠物饮食，增加纤维摄入');
            recommendations.push('确保宠物有足够的运动量');
        }
        if (statistics.averagePerWeek < 3) {
            recommendations.push('建议增加健康监测频率，每周至少记录3-4次');
        }
        if (trend === 'declining') {
            recommendations.push('健康趋势下降，建议密切关注并考虑调整护理方式');
        }
        recommendations.push('定期进行健康监测，及时发现异常变化');
        return {
            currentStatus,
            trend,
            riskLevel,
            urgency,
            recommendations
        };
    } /*
  *
     * 生成PDF健康报告
     */
    static async generateHealthReportPDF(userId, petId, days = 30) {
        const reportData = await this.generateHealthReportData(userId, petId, days);
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({ margin: 50 });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                // 生成PDF内容
                this.generatePDFContent(doc, reportData);
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 生成PDF内容
     */
    static generatePDFContent(doc, data) {
        const { pet, owner, period, statistics, trends, shapeDistribution, recentRecords, healthAssessment } = data;
        // 标题
        doc.fontSize(24).font('Helvetica-Bold').text('宠物健康报告', { align: 'center' });
        doc.moveDown(2);
        // 基本信息
        doc.fontSize(16).font('Helvetica-Bold').text('基本信息');
        doc.fontSize(12).font('Helvetica');
        doc.text(`宠物姓名: ${pet.name}`);
        doc.text(`宠物类型: ${this.getPetTypeText(pet.type)}`);
        if (pet.breed)
            doc.text(`品种: ${pet.breed}`);
        if (pet.age)
            doc.text(`年龄: ${this.formatAge(pet.age)}`);
        if (pet.weight)
            doc.text(`体重: ${pet.weight}kg`);
        doc.text(`主人: ${owner.username}`);
        doc.text(`报告期间: ${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()} (${period.days}天)`);
        doc.text(`生成时间: ${new Date().toLocaleString()}`);
        doc.moveDown(2);
        // 健康状况摘要
        doc.fontSize(16).font('Helvetica-Bold').text('健康状况摘要');
        doc.fontSize(12).font('Helvetica');
        doc.text(`总记录数: ${statistics.totalRecords}条`);
        doc.text(`健康记录: ${statistics.healthyCount}条 (${statistics.healthyPercentage}%)`);
        doc.text(`警告记录: ${statistics.warningCount}条 (${statistics.warningPercentage}%)`);
        doc.text(`异常记录: ${statistics.concerningCount}条 (${statistics.concerningPercentage}%)`);
        doc.text(`平均每周记录: ${statistics.averagePerWeek}次`);
        doc.moveDown(2);
        // 健康评估
        doc.fontSize(16).font('Helvetica-Bold').text('健康评估');
        doc.fontSize(12).font('Helvetica');
        doc.text(`当前状态: ${healthAssessment.currentStatus}`);
        doc.text(`健康趋势: ${this.getTrendText(healthAssessment.trend)}`);
        doc.text(`风险等级: ${this.getRiskLevelText(healthAssessment.riskLevel)}`);
        doc.text(`紧急程度: ${this.getUrgencyText(healthAssessment.urgency)}`);
        doc.moveDown(2);
        // 形状分布
        if (shapeDistribution.length > 0) {
            doc.fontSize(16).font('Helvetica-Bold').text('便便形状分布');
            doc.fontSize(12).font('Helvetica');
            shapeDistribution.forEach(item => {
                doc.text(`${this.getShapeDescription(item.shape)}: ${item.count}次 (${item.percentage}%)`);
            });
            doc.moveDown(2);
        }
        // 最近记录
        if (recentRecords.length > 0) {
            doc.fontSize(16).font('Helvetica-Bold').text('最近记录');
            doc.fontSize(10).font('Helvetica');
            recentRecords.slice(0, 5).forEach((record, index) => {
                doc.text(`${index + 1}. ${record.timestamp.toLocaleDateString()} - ${this.getHealthStatusText(record.healthStatus)} - ${this.getShapeDescription(record.shape)}`);
                if (record.details) {
                    doc.text(`   详情: ${record.details.substring(0, 100)}${record.details.length > 100 ? '...' : ''}`);
                }
            });
            doc.moveDown(2);
        }
        // 健康建议
        if (healthAssessment.recommendations.length > 0) {
            doc.fontSize(16).font('Helvetica-Bold').text('健康建议');
            doc.fontSize(12).font('Helvetica');
            healthAssessment.recommendations.forEach((recommendation, index) => {
                doc.text(`${index + 1}. ${recommendation}`);
            });
            doc.moveDown(2);
        }
        // 免责声明
        doc.fontSize(10).font('Helvetica').fillColor('gray');
        doc.text('免责声明: 本报告仅供参考，不能替代专业兽医诊断。如有健康问题，请及时咨询专业兽医。', { align: 'center' });
    }
    /**
     * 辅助方法 - 获取宠物类型文本
     */
    static getPetTypeText(type) {
        const typeMap = {
            dog: '狗狗',
            cat: '猫咪',
            other: '其他'
        };
        return typeMap[type] || type;
    }
    /**
     * 辅助方法 - 格式化年龄
     */
    static formatAge(ageInMonths) {
        if (ageInMonths < 12) {
            return `${ageInMonths}个月`;
        }
        else {
            const years = Math.floor(ageInMonths / 12);
            const months = ageInMonths % 12;
            if (months === 0) {
                return `${years}岁`;
            }
            else {
                return `${years}岁${months}个月`;
            }
        }
    }
    /**
     * 辅助方法 - 获取健康状态文本
     */
    static getHealthStatusText(status) {
        const statusMap = {
            healthy: '健康',
            warning: '警告',
            concerning: '异常'
        };
        return statusMap[status] || status;
    }
    /**
     * 辅助方法 - 获取形状描述
     */
    static getShapeDescription(shape) {
        const shapeMap = {
            type1: '第1型-硬球状',
            type2: '第2型-块状',
            type3: '第3型-裂纹香肠状',
            type4: '第4型-光滑香肠状',
            type5: '第5型-软块状',
            type6: '第6型-糊状',
            type7: '第7型-水状'
        };
        return shapeMap[shape] || shape;
    }
    /**
     * 辅助方法 - 获取趋势文本
     */
    static getTrendText(trend) {
        const trendMap = {
            improving: '改善中',
            stable: '稳定',
            declining: '下降中'
        };
        return trendMap[trend] || trend;
    }
    /**
     * 辅助方法 - 获取风险等级文本
     */
    static getRiskLevelText(level) {
        const levelMap = {
            low: '低风险',
            medium: '中等风险',
            high: '高风险'
        };
        return levelMap[level] || level;
    }
    /**
     * 辅助方法 - 获取紧急程度文本
     */
    static getUrgencyText(urgency) {
        const urgencyMap = {
            none: '无需特殊关注',
            monitor: '需要监测',
            consult: '建议咨询兽医',
            urgent: '紧急就医'
        };
        return urgencyMap[urgency] || urgency;
    }
    /**
     * 保存PDF报告到文件
     */
    static async saveHealthReportPDF(userId, petId, days = 30) {
        const pdfBuffer = await this.generateHealthReportPDF(userId, petId, days);
        // 确保uploads目录存在
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'reports');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `health-report-${petId}-${timestamp}.pdf`;
        const filepath = path_1.default.join(uploadsDir, filename);
        // 保存文件
        fs_1.default.writeFileSync(filepath, pdfBuffer);
        // 返回相对路径
        return `uploads/reports/${filename}`;
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=reportService.js.map