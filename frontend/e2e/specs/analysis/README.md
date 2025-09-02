# 便便分析测试套件

## 概述

本测试套件专门用于测试宠物健康监测平台的便便分析功能，包括图片上传、分析流程和结果管理的全面测试。

## 测试文件结构

```
frontend/e2e/specs/analysis/
├── README.md                                    # 本文档
├── image-upload-comprehensive.spec.ts           # 综合图片上传测试
├── analysis-process-enhanced.spec.ts            # 增强分析流程测试
├── analysis-results-management.spec.ts          # 分析结果管理测试
└── image-upload-extended.spec.ts               # 现有的扩展上传测试
```

## 测试覆盖范围

### 1. 图片上传测试 (`image-upload-comprehensive.spec.ts`)

#### 多种图片格式支持测试
- ✅ JPEG、PNG、WebP、HEIC格式支持
- ✅ 不支持格式的错误处理（GIF、BMP、TIFF）
- ✅ 格式验证和错误提示

#### 图片大小限制测试
- ✅ 合适大小图片的接受（1MB-8MB）
- ✅ 过大图片的拒绝（>10MB）
- ✅ 过小图片的警告（<100x100）
- ✅ 大小限制错误提示

#### 拖拽上传功能测试
- ✅ 单个图片拖拽上传
- ✅ 多个图片拖拽上传
- ✅ 拖拽视觉反馈
- ✅ 拖拽区域高亮显示

#### 批量上传功能测试
- ✅ 多文件选择
- ✅ 批量上传进度监控
- ✅ 批量上传取消功能
- ✅ 上传状态管理

#### 图片预处理和压缩测试
- ✅ 大尺寸图片自动压缩
- ✅ 图片方向自动旋转
- ✅ 对比度和清晰度增强
- ✅ EXIF敏感信息移除

#### 上传错误处理测试
- ✅ 网络中断错误处理
- ✅ 服务器错误处理
- ✅ 文件损坏错误处理
- ✅ 错误重试机制

#### 上传性能测试
- ✅ 上传时间性能测试
- ✅ 并发上传性能测试
- ✅ 大文件上传优化

### 2. 分析流程测试 (`analysis-process-enhanced.spec.ts`)

#### 分析进度监控测试
- ✅ 详细分析进度显示
- ✅ 分析阶段信息显示
- ✅ 预估剩余时间显示
- ✅ 实时进度更新

#### 取消分析功能测试
- ✅ 分析过程中取消
- ✅ 取消后资源清理
- ✅ 取消确认对话框
- ✅ 取消状态管理

#### 分析结果准确性和一致性测试
- ✅ 相同图片结果一致性
- ✅ 不同健康状态图片区分
- ✅ 置信度评分合理性
- ✅ 低质量图片处理

#### 分析历史对比测试
- ✅ 历史分析记录显示
- ✅ 历史记录详细对比
- ✅ 对比结果分析
- ✅ 变化趋势检测

#### 趋势分析测试
- ✅ 健康趋势图表显示
- ✅ 趋势预测功能
- ✅ 异常模式识别
- ✅ 趋势数据分析

### 3. 分析结果管理测试 (`analysis-results-management.spec.ts`)

#### 分析记录保存和编辑测试
- ✅ 完整分析记录保存
- ✅ 已保存记录编辑
- ✅ 批量记录编辑
- ✅ 记录删除和恢复

#### 分析报告生成和分享测试
- ✅ 单次分析报告生成
- ✅ 周期性健康报告（周报、月报）
- ✅ 自定义报告模板
- ✅ 多种格式导出（PDF、Word、Excel、HTML）
- ✅ 分享报告给兽医
- ✅ 生成分享链接

#### 分析数据统计和可视化测试
- ✅ 基本统计信息显示
- ✅ 时间趋势图表
- ✅ 健康分布饼图
- ✅ 自定义统计时间范围
- ✅ 数据导出功能
- ✅ 数据筛选和搜索

## 运行测试

### 使用npm脚本（推荐）

```bash
# 从项目根目录运行所有便便分析测试
npm run test:analysis

# 运行特定测试套件
npm run test:analysis:upload      # 图片上传测试
npm run test:analysis:process     # 分析流程测试
npm run test:analysis:results     # 结果管理测试

# 运行性能测试
npm run test:analysis:performance

# 清理测试数据和图片
npm run cleanup:test-data
npm run cleanup:test-images
```

### 使用专用测试运行器

```bash
cd frontend

# 运行所有测试
node e2e/run-analysis-tests.cjs

# 运行特定测试套件
node e2e/run-analysis-tests.cjs suite upload
node e2e/run-analysis-tests.cjs suite process
node e2e/run-analysis-tests.cjs suite results

# 运行性能测试
node e2e/run-analysis-tests.cjs performance

# 有头模式运行（用于调试）
node e2e/run-analysis-tests.cjs --headed

# 启用调试模式
node e2e/run-analysis-tests.cjs --debug

# 在staging环境运行
node e2e/run-analysis-tests.cjs --env staging
```

### 使用Playwright直接运行

```bash
cd frontend

# 运行所有分析测试
npx playwright test e2e/specs/analysis/

# 运行特定测试文件
npx playwright test e2e/specs/analysis/image-upload-comprehensive.spec.ts
npx playwright test e2e/specs/analysis/analysis-process-enhanced.spec.ts
npx playwright test e2e/specs/analysis/analysis-results-management.spec.ts

# 运行特定测试用例
npx playwright test --grep "应该支持JPEG格式图片上传"
```

## 测试数据管理

### 自动清理

测试运行后会自动清理：
- 创建的测试用户和宠物
- 生成的分析记录
- 上传的测试图片文件
- 临时文件和缓存

### 手动清理

```bash
# 清理测试数据
npm run cleanup:test-data

# 清理测试图片
npm run cleanup:test-images

# 清理过期图片（7天前）
cd frontend
node e2e/utils/cleanup-test-images.cjs expired 7

# 查看测试图片统计
node e2e/utils/cleanup-test-images.cjs stats
```

## 测试环境要求

### 前端环境
- Node.js 16+
- Playwright 1.40+
- 前端应用运行在 http://localhost:3000

### 后端环境
- 后端API运行在 http://localhost:5000
- 支持图片上传和分析功能
- 测试数据库（独立于生产数据库）

### 测试图片要求
- 支持多种图片格式（JPEG、PNG、WebP、HEIC）
- 图片大小限制：100KB - 10MB
- 分辨率要求：最小 200x200 像素

## 页面对象扩展

`AnalysisPage` 类已扩展支持：

### 图片上传相关方法
- `dragAndDropMultipleImages()` - 拖拽多个图片
- `selectMultipleImages()` - 选择多个图片
- `getBatchUploader()` - 获取批量上传器状态
- `monitorBatchUploadProgress()` - 监控批量上传进度
- `getCompressionInfo()` - 获取图片压缩信息
- `getEnhancementOptions()` - 获取图片增强选项

### 分析流程相关方法
- `waitForAnalysisStage()` - 等待分析阶段
- `getCurrentAnalysisStage()` - 获取当前分析阶段
- `getTimeEstimate()` - 获取时间估算
- `getAnalysisStatus()` - 获取分析状态
- `getTrendAnalysis()` - 获取趋势分析
- `getAnomalyDetection()` - 获取异常检测

### 结果管理相关方法
- `goToRecordsManagement()` - 导航到记录管理
- `editRecordNotes()` - 编辑记录备注
- `generateSingleReport()` - 生成单次报告
- `exportReport()` - 导出报告
- `shareReportToVet()` - 分享报告给兽医
- `getBasicStatistics()` - 获取基本统计信息

## 测试配置

### 超时设置
- 默认测试超时：90秒（分析测试需要更长时间）
- 性能测试超时：120秒
- 上传测试超时：60秒

### 重试策略
- 默认重试次数：2次
- 性能测试重试：0次（确保准确性）
- 网络相关测试重试：3次

### 并发设置
- 默认并发数：2个worker
- 性能测试并发：1个worker（避免干扰）
- 上传测试并发：1个worker（避免网络冲突）

## 故障排除

### 常见问题

1. **图片上传失败**
   - 检查后端服务是否支持文件上传
   - 验证图片格式和大小限制
   - 检查网络连接和超时设置

2. **分析超时**
   - 增加测试超时时间
   - 检查AI分析服务是否正常
   - 验证测试图片质量

3. **测试数据清理失败**
   - 手动运行清理脚本
   - 检查数据库连接
   - 验证文件系统权限

4. **性能测试不稳定**
   - 确保测试环境资源充足
   - 减少并发数量
   - 检查系统负载

### 调试技巧

1. **启用调试模式**
   ```bash
   npm run test:analysis -- --debug --headed
   ```

2. **查看测试报告**
   ```bash
   npx playwright show-report
   ```

3. **单独运行失败的测试**
   ```bash
   npx playwright test --grep "特定测试名称"
   ```

4. **查看测试截图**
   - 失败测试的截图保存在 `test-results/` 目录
   - 可以查看上传和分析过程的视觉状态

## 最佳实践

### 测试编写
1. **独立性**：每个测试用例独立运行，不依赖其他测试
2. **清理**：测试后及时清理创建的数据和文件
3. **等待**：使用适当的等待策略，特别是分析过程
4. **断言**：使用明确的断言，便于问题定位

### 图片管理
1. **格式**：使用标准的测试图片格式
2. **大小**：控制测试图片大小，避免过大文件
3. **命名**：使用描述性的文件名，便于识别
4. **清理**：定期清理测试图片，避免磁盘空间不足

### 性能测试
1. **隔离**：性能测试单独运行，避免干扰
2. **基准**：建立性能基准，监控回归
3. **环境**：确保测试环境一致性
4. **监控**：监控系统资源使用情况

## 维护指南

### 定期维护
1. **更新依赖**：定期更新Playwright和相关依赖
2. **清理数据**：定期清理累积的测试数据和图片
3. **性能监控**：监控测试执行时间和成功率
4. **文档更新**：及时更新测试文档和说明

### 扩展测试
1. **新功能**：为新的分析功能添加对应测试
2. **边界情况**：补充边界情况和异常场景测试
3. **性能测试**：添加更多性能和压力测试
4. **兼容性**：增加跨浏览器和设备兼容性测试

## 联系信息

如有问题或建议，请联系：
- 测试团队: test-team@company.com
- 开发团队: dev-team@company.com
- 项目经理: pm@company.com