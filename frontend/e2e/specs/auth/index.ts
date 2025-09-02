/**
 * 用户认证测试套件索引
 * 
 * 这个文件导出所有认证相关的测试模块，便于统一管理和运行
 */

// 基础认证测试
export * from './registration-extended.spec';
export * from './login-enhanced.spec';
export * from './password-management.spec';

/**
 * 认证测试套件说明：
 * 
 * 1. registration-extended.spec.ts - 扩展注册流程测试
 *    - 邮箱验证测试
 *    - 密码强度验证测试
 *    - 用户名重复检查测试
 *    - 注册表单验证测试
 *    - 注册错误提示测试
 *    - 注册成功后用户状态验证测试
 *    - 注册表单交互测试
 *    - 注册性能测试
 * 
 * 2. login-enhanced.spec.ts - 增强登录功能测试
 *    - 记住登录状态测试
 *    - 自动登录测试
 *    - 登录失败重试和账户锁定测试
 *    - 多设备登录和会话管理测试
 *    - 登录安全功能测试
 *    - 登录用户体验测试
 * 
 * 3. password-management.spec.ts - 密码管理测试
 *    - 密码重置测试
 *    - 修改密码测试
 *    - 密码安全策略验证测试
 *    - 密码历史和过期检查测试
 *    - 密码安全事件测试
 *    - 密码管理用户体验测试
 * 
 * 测试覆盖的需求：
 * - 需求1.1: 核心功能测试覆盖
 * - 需求3.3: 错误处理和边界情况测试
 * 
 * 运行方式：
 * - 运行所有认证测试: npx playwright test specs/auth/
 * - 运行特定测试文件: npx playwright test specs/auth/registration-extended.spec.ts
 * - 运行特定测试组: npx playwright test --grep "邮箱验证测试"
 */

/**
 * 测试数据依赖：
 * - TestDataManager: 创建和管理测试用户数据
 * - APIMocker: 模拟API响应和错误情况
 * - AuthPage: 认证页面对象，提供认证相关操作方法
 */

/**
 * 测试环境要求：
 * - 测试数据库应该与生产数据库隔离
 * - 需要支持并行测试执行
 * - 测试完成后应该自动清理测试数据
 */