# 认证API文档

## 用户注册

### POST /api/auth/register

注册新用户账户。

#### 请求体

```json
{
  "username": "string",      // 用户名，2-20字符，只能包含字母、数字、下划线和中文
  "email": "string",         // 邮箱地址
  "password": "string",      // 密码，至少6字符，必须包含字母和数字
  "confirmPassword": "string" // 确认密码，必须与password相同
}
```

#### 成功响应 (201)

```json
{
  "success": true,
  "message": "用户注册成功",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "avatar": null,
      "profile": {
        "firstName": "",
        "lastName": "",
        "phone": "",
        "location": "",
        "bio": ""
      },
      "preferences": {
        "notifications": true,
        "emailUpdates": true,
        "language": "zh-CN"
      },
      "stats": {
        "totalAnalysis": 0,
        "totalPosts": 0,
        "reputation": 0
      },
      "isActive": true,
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "string",  // JWT访问令牌，15分钟有效
      "refreshToken": "string"  // JWT刷新令牌，7天有效
    }
  }
}
```

#### 错误响应

##### 400 - 验证失败

```json
{
  "success": false,
  "message": "输入数据验证失败",
  "errors": [
    {
      "field": "username",
      "message": "用户名长度必须在2-20个字符之间"
    }
  ]
}
```

##### 400 - 用户名或邮箱已存在

```json
{
  "success": false,
  "message": "用户名已存在",
  "errors": [
    {
      "field": "username",
      "message": "该用户名已被使用"
    }
  ]
}
```

##### 500 - 服务器错误

```json
{
  "success": false,
  "message": "服务器内部错误，请稍后重试"
}
```

#### 验证规则

- **username**: 2-20字符，只能包含字母、数字、下划线和中文字符，必须唯一
- **email**: 有效的邮箱格式，必须唯一
- **password**: 至少6字符，必须包含至少一个字母和一个数字
- **confirmPassword**: 必须与password完全相同

#### 安全特性

- 密码使用bcrypt加密存储（12轮加盐）
- 返回JWT访问令牌和刷新令牌
- 不在响应中返回密码
- 自动检查用户名和邮箱唯一性
- 输入数据验证和清理

#### 使用示例

```javascript
// 使用fetch API
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'petlover123',
    email: 'user@example.com',
    password: 'mypassword123',
    confirmPassword: 'mypassword123'
  })
});

const data = await response.json();

if (data.success) {
  // 保存令牌
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
  
  // 保存用户信息
  localStorage.setItem('user', JSON.stringify(data.data.user));
  
  console.log('注册成功!', data.data.user);
} else {
  console.error('注册失败:', data.message, data.errors);
}
```

#### 注意事项

1. 注册成功后会自动生成访问令牌，用户无需再次登录
2. 新注册用户的`isVerified`字段为`false`，可能需要邮箱验证
3. 访问令牌有效期为15分钟，刷新令牌有效期为7天
4. 所有错误信息都是中文，便于用户理解