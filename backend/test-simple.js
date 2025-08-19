// 简单的注册功能验证脚本
const mongoose = require('mongoose');
const User = require('./dist/models/User').default;

async function testUserModel() {
  try {
    console.log('连接数据库...');
    await mongoose.connect('mongodb://localhost:27017/pet-health');
    console.log('✅ 数据库连接成功');

    // 测试创建用户
    console.log('\n测试用户模型...');
    const testUser = new User({
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123'
    });

    const savedUser = await testUser.save();
    console.log('✅ 用户创建成功');
    console.log('用户ID:', savedUser._id);
    console.log('用户名:', savedUser.username);
    console.log('邮箱:', savedUser.email);
    console.log('密码已加密:', savedUser.password !== 'password123');

    // 测试密码比较
    const isPasswordValid = await savedUser.comparePassword('password123');
    console.log('✅ 密码验证:', isPasswordValid ? '正确' : '错误');

    // 清理测试数据
    await User.deleteOne({ _id: savedUser._id });
    console.log('✅ 测试数据已清理');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

testUserModel();