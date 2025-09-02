# 可访问性测试套件

本目录包含宠物健康监测社区平台的可访问性测试，确保应用符合WCAG 2.1 AA级别标准，为所有用户提供良好的使用体验。

## 测试概述

### 测试目标
- 验证键盘导航功能完整性
- 确保屏幕阅读器兼容性
- 检查颜色对比度和视觉辅助功能
- 验证WCAG 2.1 AA级别合规性

### 测试覆盖范围
- 键盘导航和焦点管理
- ARIA标签和语义化HTML
- 屏幕阅读器支持
- 颜色对比度
- 色盲友好设计
- 文字大小和间距
- 高对比度模式支持

## 测试文件结构

```
accessibility/
├── keyboard-navigation.spec.ts          # 键盘导航测试
├── screen-reader-compatibility.spec.ts  # 屏幕阅读器兼容性测试
├── color-contrast-visual.spec.ts        # 色彩对比和视觉辅助测试
└── README.md                            # 本文档
```

## 运行测试

### 运行所有可访问性测试
```bash
# 从项目根目录
npm run test:accessibility

# 或者从frontend目录
cd frontend
node e2e/run-accessibility-tests.cjs
```

### 运行特定测试文件
```bash
# 键盘导航测试
npx playwright test specs/accessibility/keyboard-navigation.spec.ts

# 屏幕阅读器测试
npx playwright test specs/accessibility/screen-reader-compatibility.spec.ts

# 色彩对比测试
npx playwright test specs/accessibility/color-contrast-visual.spec.ts
```

### 运行特定测试用例
```bash
# 运行特定测试组
npx playwright test -g "Tab键导航测试"
npx playwright test -g "ARIA标签和语义化HTML测试"
npx playwright test -g "颜色对比度测试"
```

## 测试详情

### 1. 键盘导航测试 (keyboard-navigation.spec.ts)

#### Tab键导航测试
- **主页Tab键导航顺序**: 验证焦点按逻辑顺序移动
- **登录表单Tab键导航**: 测试表单字段间的Tab导航
- **宠物管理页面Tab键导航**: 验证复杂页面的Tab顺序
- **分析页面Tab键导航**: 测试文件上传和表单的Tab导航

#### 快捷键操作测试
- **全局快捷键功能**: 测试Escape、Enter等通用快捷键
- **表单快捷键操作**: 验证表单提交快捷键
- **列表导航快捷键**: 测试方向键和空格键操作

#### 焦点管理测试
- **模态框焦点陷阱**: 验证模态框内的焦点循环
- **下拉菜单焦点管理**: 测试菜单的焦点控制
- **表单字段焦点可见性**: 检查焦点指示器

#### 键盘陷阱检测测试
- **检测并修复键盘陷阱**: 自动检测无法逃脱的焦点循环
- **验证跳过链接功能**: 测试跳转到主内容的链接

### 2. 屏幕阅读器兼容性测试 (screen-reader-compatibility.spec.ts)

#### ARIA标签和语义化HTML测试
- **页面标题和地标元素**: 验证页面结构的语义化
- **表单元素ARIA标签**: 检查表单字段的标签关联
- **按钮和链接可访问性**: 验证交互元素的可访问名称
- **图片替代文本**: 检查图片的alt属性
- **表格可访问性**: 验证表格的标题和表头关联

#### 屏幕阅读器导航测试
- **标题层次结构**: 检查H1-H6标题的逻辑层次
- **列表结构**: 验证列表的HTML结构
- **区域和地标导航**: 测试页面区域的标签

#### 内容朗读测试
- **动态内容更新通知**: 验证实时区域的更新通知
- **表单验证消息**: 测试错误消息的朗读
- **状态变化通知**: 验证状态更新的通知

#### 可访问性标准合规性测试
- **WCAG 2.1 AA级别合规性检查**: 使用axe-core进行自动化检查
- **颜色对比度检查**: 基础的对比度验证
- **焦点指示器可见性**: 验证焦点样式
- **语言属性设置**: 检查页面语言标记

### 3. 色彩对比和视觉辅助测试 (color-contrast-visual.spec.ts)

#### 颜色对比度测试
- **正常文本颜色对比度检查**: 验证4.5:1的对比度要求
- **按钮和交互元素对比度检查**: 测试交互元素的对比度
- **表单字段对比度检查**: 验证输入字段的对比度
- **错误和警告消息对比度**: 检查状态消息的高对比度

#### 色盲友好设计测试
- **红绿色盲友好性检查**: 模拟色盲视觉测试信息传达
- **图表和数据可视化色盲友好性**: 验证图表的非颜色标识
- **链接和按钮色盲友好性**: 检查交互元素的非颜色指示器

#### 文字大小和间距测试
- **文字大小可调节性**: 测试200%缩放下的可用性
- **最小字体大小检查**: 验证字体大小不小于12px
- **行间距和字符间距检查**: 检查文本的可读性间距
- **触摸目标大小检查**: 验证移动端触摸目标至少44px
- **响应式文字缩放**: 测试不同屏幕尺寸的字体调整

#### 高对比度模式测试
- **Windows高对比度模式兼容性**: 模拟系统高对比度模式
- **暗色主题对比度**: 验证暗色主题的对比度

## 测试数据和环境

### 测试前提条件
- 应用服务器运行在开发模式
- 测试数据库包含基础测试数据
- 测试用户账户可用

### 测试环境配置
- 支持多浏览器测试（Chrome、Firefox、Safari）
- 包含移动端视口测试
- 集成axe-core可访问性检查工具

## 故障排除

### 常见问题

1. **焦点指示器不可见**
   - 检查CSS中的outline和box-shadow样式
   - 确保:focus伪类有适当的样式定义

2. **ARIA标签缺失**
   - 为表单字段添加适当的label或aria-label
   - 为交互元素提供可访问的名称

3. **颜色对比度不足**
   - 调整文本和背景色的对比度
   - 使用在线对比度检查工具验证

4. **键盘导航问题**
   - 检查tabindex属性的使用
   - 确保所有交互元素都可以通过键盘访问

### 调试技巧

1. **使用浏览器开发工具**
   - Chrome DevTools的Accessibility面板
   - Firefox的Accessibility Inspector

2. **屏幕阅读器测试**
   - Windows: NVDA (免费)
   - macOS: VoiceOver (内置)
   - 浏览器扩展: Screen Reader for Google Chrome

3. **自动化工具**
   - axe-core浏览器扩展
   - WAVE Web Accessibility Evaluation Tool
   - Lighthouse可访问性审计

## 最佳实践

### 开发建议

1. **语义化HTML**
   - 使用适当的HTML元素（button、nav、main等）
   - 正确的标题层次结构
   - 有意义的链接文本

2. **ARIA使用**
   - 只在必要时使用ARIA
   - 优先使用原生HTML语义
   - 保持ARIA状态同步

3. **键盘导航**
   - 逻辑的Tab顺序
   - 可见的焦点指示器
   - 适当的键盘快捷键

4. **视觉设计**
   - 足够的颜色对比度
   - 不仅依赖颜色传达信息
   - 适当的字体大小和间距

### 测试策略

1. **渐进式测试**
   - 从基础的键盘导航开始
   - 逐步添加复杂的交互测试
   - 最后进行综合的可访问性审计

2. **用户测试**
   - 邀请使用辅助技术的用户参与测试
   - 收集真实用户的反馈
   - 持续改进可访问性

3. **自动化集成**
   - 将可访问性测试集成到CI/CD流程
   - 设置可访问性回归检测
   - 定期运行全面的可访问性审计

## 参考资源

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [WebAIM Resources](https://webaim.org/resources/)

## 更新日志

- **2024-01-XX**: 初始版本，包含基础可访问性测试
- **2024-01-XX**: 添加色盲友好性测试
- **2024-01-XX**: 集成axe-core自动化检查
- **2024-01-XX**: 完善高对比度模式测试