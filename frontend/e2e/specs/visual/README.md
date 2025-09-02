# 视觉回归测试套件

本目录包含所有视觉回归测试，用于检测UI的视觉变化和确保跨平台一致性。

## 测试结构

```
visual/
├── README.md                          # 本文档
├── full-page-screenshots.spec.ts      # 全页面截图测试
├── component-visual.spec.ts           # 组件级视觉测试
├── cross-platform-visual.spec.ts     # 跨平台视觉一致性测试
├── theme-visual.spec.ts               # 主题和样式测试
├── animation-visual.spec.ts           # 动画和过渡效果测试
└── responsive-visual.spec.ts          # 响应式设计视觉测试
```

## 测试类型

### 1. 全页面截图测试 (full-page-screenshots.spec.ts)
- 捕获完整页面的截图
- 对比不同版本之间的页面变化
- 检测布局和样式的整体变化

### 2. 组件级视觉测试 (component-visual.spec.ts)
- 测试单个UI组件的视觉一致性
- 验证组件在不同状态下的外观
- 检测组件样式的意外变化

### 3. 跨平台视觉一致性测试 (cross-platform-visual.spec.ts)
- 在不同浏览器和操作系统上对比视觉效果
- 检测字体渲染差异
- 验证颜色显示一致性

### 4. 主题和样式测试 (theme-visual.spec.ts)
- 测试主题切换的视觉效果
- 验证样式变更的正确性
- 检测CSS变化的影响

### 5. 动画和过渡效果测试 (animation-visual.spec.ts)
- 捕获动画的关键帧
- 测试过渡效果的一致性
- 验证动画性能和流畅度

### 6. 响应式设计视觉测试 (responsive-visual.spec.ts)
- 测试不同屏幕尺寸下的布局
- 验证移动端适配效果
- 检测响应式断点的正确性

## 运行测试

### 运行所有视觉测试
```bash
npm run test:visual
```

### 运行特定测试套件
```bash
# 全页面截图测试
npx playwright test specs/visual/full-page-screenshots.spec.ts

# 组件视觉测试
npx playwright test specs/visual/component-visual.spec.ts

# 跨平台测试
npx playwright test specs/visual/cross-platform-visual.spec.ts
```

### 更新基准图片
```bash
# 更新所有基准
npm run baseline update --force --backup

# 更新特定测试套件
npm run baseline update visual --force

# 更新特定基准
npm run baseline update visual login-page --force
```

## 配置说明

### 视觉测试配置
- **阈值**: 默认0.2%，可在测试中调整
- **动画**: 默认禁用，确保截图一致性
- **等待策略**: 等待网络空闲和页面稳定
- **遮罩**: 隐藏动态内容（时间戳、随机数等）

### 截图设置
- **格式**: PNG，质量90%
- **全页面**: 默认启用
- **设备**: 支持桌面和移动设备
- **浏览器**: Chrome、Firefox、Safari、Edge

## 最佳实践

### 1. 测试稳定性
- 等待页面完全加载
- 禁用动画和过渡效果
- 隐藏动态内容
- 使用固定的测试数据

### 2. 基准管理
- 定期审查和更新基准
- 备份重要基准
- 记录基准更新原因
- 版本控制基准图片

### 3. 差异分析
- 仔细审查视觉差异
- 区分预期和意外变化
- 记录差异原因
- 及时更新基准

### 4. 性能优化
- 合理设置截图区域
- 避免不必要的全页面截图
- 使用并行执行
- 定期清理测试文件

## 故障排除

### 常见问题

1. **截图不一致**
   - 检查页面加载状态
   - 确认动画已禁用
   - 验证测试数据一致性

2. **基准缺失**
   - 运行测试会自动创建基准
   - 手动复制实际截图作为基准
   - 检查文件路径和权限

3. **差异过大**
   - 调整差异阈值
   - 检查页面内容变化
   - 考虑更新基准

4. **跨平台差异**
   - 使用平台特定基准
   - 调整字体和渲染设置
   - 考虑平台差异容忍度

## 报告和监控

### 测试报告
- HTML格式的详细报告
- 包含截图对比和差异分析
- 提供修复建议和操作指南

### 监控指标
- 测试通过率
- 平均差异百分比
- 基准更新频率
- 测试执行时间

### 集成CI/CD
- 自动运行视觉测试
- 失败时阻止部署
- 生成测试报告
- 通知相关人员

## 工具和实用程序

### 基准管理工具
```bash
# 列出所有基准
npm run baseline list

# 备份基准
npm run baseline backup

# 清理旧备份
npm run baseline cleanup

# 生成基准报告
npm run baseline report
```

### 差异分析工具
- 高级差异检测算法
- 区域差异分析
- 差异类型分类
- 详细分析报告

### 视觉测试工具
- 截图捕获和对比
- 动态内容处理
- 跨平台兼容性
- 性能优化功能