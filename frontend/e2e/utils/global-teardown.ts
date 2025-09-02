/**
 * 全局测试清理
 */
export default async function globalTeardown(): Promise<void> {
  console.log('Starting global test teardown...');
  
  // 这里可以添加全局清理逻辑
  // 例如：关闭测试数据库、清理测试文件等
  
  console.log('Global test teardown completed');
}