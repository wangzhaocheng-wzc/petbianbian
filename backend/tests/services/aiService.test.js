"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aiService_1 = require("../../src/services/aiService");
describe('AIService', () => {
    describe('preprocessImage', () => {
        it('should preprocess test image successfully', async () => {
            const testImagePath = 'test-poop.jpg';
            const result = await aiService_1.AIService.preprocessImage(testImagePath);
            expect(result).toBeDefined();
            expect(result.buffer).toBeInstanceOf(Buffer);
            expect(result.width).toBe(512);
            expect(result.height).toBe(512);
            expect(result.format).toBe('jpeg');
            expect(result.size).toBeGreaterThan(0);
        });
        it('should handle test images with mock data', async () => {
            const testImagePath = 'test-analysis-upload.jpg';
            const result = await aiService_1.AIService.preprocessImage(testImagePath);
            expect(result.buffer.toString()).toContain('mock-image-data');
            expect(result.width).toBe(512);
            expect(result.height).toBe(512);
            expect(result.format).toBe('jpeg');
        });
        it('should throw error for invalid image path', async () => {
            const invalidPath = 'non-existent-image.jpg';
            await expect(aiService_1.AIService.preprocessImage(invalidPath)).rejects.toThrow('图片预处理失败');
        });
    });
    describe('validatePoopContent', () => {
        it('should validate test image content successfully', async () => {
            const mockProcessedImage = {
                buffer: Buffer.from('mock-image-data'),
                width: 512,
                height: 512,
                format: 'jpeg',
                size: 1024
            };
            const result = await aiService_1.AIService.validatePoopContent(mockProcessedImage);
            expect(result).toBe(true);
        });
        it('should reject images that are too small', async () => {
            const smallImage = {
                buffer: Buffer.from('small'),
                width: 100,
                height: 100,
                format: 'jpeg',
                size: 500 // 小于1000字节
            };
            const result = await aiService_1.AIService.validatePoopContent(smallImage);
            expect(result).toBe(false);
        });
        it('should handle content validation with random confidence', async () => {
            const normalImage = {
                buffer: Buffer.from('normal-image-data-with-sufficient-size'),
                width: 512,
                height: 512,
                format: 'jpeg',
                size: 2048
            };
            // 由于使用随机数，我们测试多次以确保逻辑正确
            const results = [];
            for (let i = 0; i < 10; i++) {
                const result = await aiService_1.AIService.validatePoopContent(normalImage);
                results.push(result);
            }
            // 至少应该有一些true和false的结果（由于随机性）
            expect(results).toContain(true);
            expect(results.every(r => typeof r === 'boolean')).toBe(true);
        });
    });
    describe('analyzePoopImage', () => {
        it('should analyze image and return valid result', async () => {
            const mockProcessedImage = {
                buffer: Buffer.from('mock-image-data'),
                width: 512,
                height: 512,
                format: 'jpeg',
                size: 1024
            };
            const result = await aiService_1.AIService.analyzePoopImage(mockProcessedImage);
            expect(result).toBeDefined();
            expect(result.shape).toMatch(/^type[1-7]$/);
            expect(['healthy', 'warning', 'concerning']).toContain(result.healthStatus);
            expect(result.confidence).toBeGreaterThanOrEqual(70);
            expect(result.confidence).toBeLessThanOrEqual(100);
            expect(result.details).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.detectedFeatures).toBeDefined();
            expect(result.detectedFeatures.color).toBeDefined();
            expect(result.detectedFeatures.texture).toBeDefined();
            expect(result.detectedFeatures.consistency).toBeDefined();
            expect(result.detectedFeatures.size).toBeDefined();
        });
        it('should generate consistent health status based on shape', async () => {
            const mockProcessedImage = {
                buffer: Buffer.from('mock-image-data'),
                width: 512,
                height: 512,
                format: 'jpeg',
                size: 1024
            };
            // 测试多次以验证健康状态与形状的对应关系
            const results = [];
            for (let i = 0; i < 20; i++) {
                const result = await aiService_1.AIService.analyzePoopImage(mockProcessedImage);
                results.push(result);
            }
            // 验证type1和type7应该是concerning
            const type1Results = results.filter(r => r.shape === 'type1');
            const type7Results = results.filter(r => r.shape === 'type7');
            if (type1Results.length > 0) {
                expect(type1Results.every(r => r.healthStatus === 'concerning')).toBe(true);
            }
            if (type7Results.length > 0) {
                expect(type7Results.every(r => r.healthStatus === 'concerning')).toBe(true);
            }
            // 验证type3, type4, type5应该是healthy
            const healthyTypes = results.filter(r => ['type3', 'type4', 'type5'].includes(r.shape));
            if (healthyTypes.length > 0) {
                expect(healthyTypes.every(r => r.healthStatus === 'healthy')).toBe(true);
            }
        });
        it('should include appropriate recommendations based on health status', async () => {
            const mockProcessedImage = {
                buffer: Buffer.from('mock-image-data'),
                width: 512,
                height: 512,
                format: 'jpeg',
                size: 1024
            };
            const result = await aiService_1.AIService.analyzePoopImage(mockProcessedImage);
            if (result.healthStatus === 'healthy') {
                expect(result.recommendations).toContain('继续保持当前的饮食习惯');
            }
            else if (result.healthStatus === 'warning') {
                expect(result.recommendations).toContain('适当调整饮食结构');
            }
            else if (result.healthStatus === 'concerning') {
                expect(result.recommendations).toContain('建议立即咨询专业兽医');
            }
        });
        it('should simulate analysis delay', async () => {
            const mockProcessedImage = {
                buffer: Buffer.from('mock-image-data'),
                width: 512,
                height: 512,
                format: 'jpeg',
                size: 1024
            };
            const startTime = Date.now();
            await aiService_1.AIService.analyzePoopImage(mockProcessedImage);
            const endTime = Date.now();
            // 应该至少有1秒的延迟
            expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
        });
    });
    describe('validateAnalysisResult', () => {
        it('should validate correct analysis result', () => {
            const validResult = {
                shape: 'type4',
                healthStatus: 'healthy',
                confidence: 85,
                details: '便便呈光滑香肠状，形状和质地都很正常',
                recommendations: ['继续保持当前的饮食习惯'],
                detectedFeatures: {
                    color: '棕色',
                    texture: '光滑',
                    consistency: '正常',
                    size: '正常'
                }
            };
            const result = aiService_1.AIService.validateAnalysisResult(validResult);
            expect(result).toBe(true);
        });
        it('should reject result with missing required fields', () => {
            const invalidResult = {
                shape: 'type4',
                healthStatus: 'healthy'
                // 缺少confidence等字段
            };
            const result = aiService_1.AIService.validateAnalysisResult(invalidResult);
            expect(result).toBe(false);
        });
        it('should reject result with invalid confidence range', () => {
            const invalidResult = {
                shape: 'type4',
                healthStatus: 'healthy',
                confidence: 150, // 超出范围
                details: 'test',
                recommendations: ['test'],
                detectedFeatures: {
                    color: '棕色',
                    texture: '光滑',
                    consistency: '正常',
                    size: '正常'
                }
            };
            const result = aiService_1.AIService.validateAnalysisResult(invalidResult);
            expect(result).toBe(false);
        });
        it('should reject result with invalid shape type', () => {
            const invalidResult = {
                shape: 'type8', // 无效形状
                healthStatus: 'healthy',
                confidence: 85,
                details: 'test',
                recommendations: ['test'],
                detectedFeatures: {
                    color: '棕色',
                    texture: '光滑',
                    consistency: '正常',
                    size: '正常'
                }
            };
            const result = aiService_1.AIService.validateAnalysisResult(invalidResult);
            expect(result).toBe(false);
        });
        it('should reject result with invalid health status', () => {
            const invalidResult = {
                shape: 'type4',
                healthStatus: 'invalid', // 无效状态
                confidence: 85,
                details: 'test',
                recommendations: ['test'],
                detectedFeatures: {
                    color: '棕色',
                    texture: '光滑',
                    consistency: '正常',
                    size: '正常'
                }
            };
            const result = aiService_1.AIService.validateAnalysisResult(invalidResult);
            expect(result).toBe(false);
        });
    });
    describe('getShapeDescription', () => {
        it('should return correct descriptions for all shape types', () => {
            const shapes = ['type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7'];
            shapes.forEach(shape => {
                const description = aiService_1.AIService.getShapeDescription(shape);
                expect(description).toContain(shape.replace('type', '第') + '型');
                expect(description).not.toBe('未知类型');
            });
        });
        it('should return unknown type for invalid shape', () => {
            const description = aiService_1.AIService.getShapeDescription('invalid');
            expect(description).toBe('未知类型');
        });
    });
    describe('getHealthStatusDescription', () => {
        it('should return correct descriptions for all health statuses', () => {
            const statuses = ['healthy', 'warning', 'concerning'];
            const expectedTexts = ['健康', '警告', '异常'];
            statuses.forEach((status, index) => {
                const description = aiService_1.AIService.getHealthStatusDescription(status);
                expect(description).toContain(expectedTexts[index]);
                expect(description).not.toBe('未知状态');
            });
        });
        it('should return unknown status for invalid status', () => {
            const description = aiService_1.AIService.getHealthStatusDescription('invalid');
            expect(description).toBe('未知状态');
        });
    });
    describe('Integration Tests', () => {
        it('should complete full analysis workflow', async () => {
            const testImagePath = 'test-poop-analysis.jpg';
            // 1. 预处理图片
            const processedImage = await aiService_1.AIService.preprocessImage(testImagePath);
            expect(processedImage).toBeDefined();
            // 2. 验证内容
            const isValidContent = await aiService_1.AIService.validatePoopContent(processedImage);
            expect(typeof isValidContent).toBe('boolean');
            // 3. 执行分析
            const analysisResult = await aiService_1.AIService.analyzePoopImage(processedImage);
            expect(analysisResult).toBeDefined();
            // 4. 验证结果
            const isValidResult = aiService_1.AIService.validateAnalysisResult(analysisResult);
            expect(isValidResult).toBe(true);
            // 5. 获取描述
            const shapeDesc = aiService_1.AIService.getShapeDescription(analysisResult.shape);
            const statusDesc = aiService_1.AIService.getHealthStatusDescription(analysisResult.healthStatus);
            expect(shapeDesc).not.toBe('未知类型');
            expect(statusDesc).not.toBe('未知状态');
        });
    });
});
//# sourceMappingURL=aiService.test.js.map