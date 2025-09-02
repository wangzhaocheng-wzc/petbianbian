# Test Fixtures

This directory contains test fixtures and mock data for Playwright tests.

## Files

- `test-data.json` - 测试数据，包括用户、宠物、分析记录等
- `mock-responses.json` - API模拟响应数据
- `images/` - 测试用图片文件（需要手动添加）

## 图片文件说明

需要在 `images/` 目录下添加以下测试图片：

### 用户头像
- `avatar1.jpg`, `avatar2.jpg`, `avatar3.jpg` - 用户头像

### 宠物图片
- `dog1.jpg`, `dog2.jpg`, `dog3.jpg` - 狗狗图片
- `cat1.jpg`, `cat2.jpg` - 猫咪图片

### 便便分析图片
- `poop_healthy_1.jpg` - 健康便便样本
- `poop_warning_1.jpg` - 警告状态便便样本
- `poop_concerning_1.jpg` - 异常便便样本
- `poop_test_1.jpg` - 通用测试图片

### 社区帖子图片
- `community_post_1.jpg`, `community_post_2.jpg`, `community_post_3.jpg` - 社区帖子图片

### 测试用文件
- `test-poop.jpg` - 用于便便分析测试的示例图片
- `test-poop-1.jpg`, `test-poop-2.jpg` - 用于批量分析测试的图片
- `pet-photo.jpg` - 用于社区帖子的宠物照片
- `large-image.jpg` - 用于文件大小验证测试的大图片
- `test-document.pdf` - 用于文件格式验证测试的非图片文件

## 使用方法

```typescript
import testData from '../fixtures/test-data.json';
import mockResponses from '../fixtures/mock-responses.json';

// 使用测试数据
const testUser = testData.users[0];

// 使用模拟响应
const loginResponse = mockResponses.auth.login.success;
```

## 注意事项

- 这些文件仅用于测试目的
- 实际测试时需要准备相应的测试文件
- 文件大小和格式应符合测试需求