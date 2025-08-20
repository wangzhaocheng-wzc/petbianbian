const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// 测试用户凭据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';
let testPetId = '';

// 登录获取token
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE}/auth/login`, testUser);
    
    if (response.data.success) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 获取宠物列表
async function getPets() {
  try {
    console.log('🐕 获取宠物列表...');
    const response = await axios.get(`${API_BASE}/pets`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.pets.length > 0) {
      testPetId = response.data.data.pets[0].id;
      console.log('✅ 获取宠物成功:', response.data.data.pets[0].name);
      return true;
    } else {
      console.log('❌ 没有找到宠物');
      return false;
    }
  } catch (error) {
    console.log('❌ 获取宠物失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试创建通知
async function testCreateNotification() {
  try {
    console.log('\n📢 测试创建通知...');
    const notificationData = {
      type: 'alert',
      category: 'health',
      title: '测试健康警报',
      message: '这是一条测试健康警报通知，用于验证通知系统功能。',
      petId: testPetId,
      priority: 'high',
      data: {
        anomalyType: 'health_decline',
        severity: 'medium',
        petName: '测试宠物',
        actionUrl: `/pets/${testPetId}/health`,
        metadata: {
          confidence: 85,
          recommendations: ['密切观察宠物状态', '记录相关症状', '考虑咨询兽医']
        }
      },
      channels: {
        inApp: true,
        email: false,
        push: false
      }
    };
    
    const response = await axios.post(`${API_BASE}/notifications`, notificationData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 通知创建成功');
      console.log(`   - 通知ID: ${response.data.data._id}`);
      console.log(`   - 标题: ${response.data.data.title}`);
      console.log(`   - 类型: ${response.data.data.type}`);
      console.log(`   - 分类: ${response.data.data.category}`);
      console.log(`   - 优先级: ${response.data.data.priority}`);
      console.log(`   - 状态: ${response.data.data.status}`);
      return response.data.data._id;
    } else {
      console.log('❌ 创建通知失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 创建通知请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 测试获取通知列表
async function testGetNotifications() {
  try {
    console.log('\n📋 测试获取通知列表...');
    const response = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 10,
        status: 'unread'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取通知列表成功');
      const data = response.data.data;
      console.log(`   - 总通知数: ${data.total}`);
      console.log(`   - 未读通知数: ${data.unreadCount}`);
      console.log(`   - 当前页: ${data.page}/${data.totalPages}`);
      console.log(`   - 本页通知数: ${data.notifications.length}`);
      
      if (data.notifications.length > 0) {
        console.log('\n📋 通知列表:');
        data.notifications.forEach((notification, index) => {
          console.log(`   ${index + 1}. ${notification.title}`);
          console.log(`      类型: ${notification.type} | 分类: ${notification.category}`);
          console.log(`      优先级: ${notification.priority} | 状态: ${notification.status}`);
          console.log(`      创建时间: ${new Date(notification.createdAt).toLocaleString()}`);
          if (notification.data?.severity) {
            console.log(`      严重程度: ${notification.data.severity}`);
          }
        });
      }
      
      return data.notifications;
    } else {
      console.log('❌ 获取通知列表失败:', response.data.message);
      return [];
    }
  } catch (error) {
    console.log('❌ 获取通知列表请求失败:', error.response?.data?.message || error.message);
    return [];
  }
}

// 测试获取未读通知数量
async function testGetUnreadCount() {
  try {
    console.log('\n🔔 测试获取未读通知数量...');
    const response = await axios.get(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 获取未读通知数量成功');
      console.log(`   - 未读通知数量: ${response.data.data.unreadCount}`);
      return response.data.data.unreadCount;
    } else {
      console.log('❌ 获取未读通知数量失败:', response.data.message);
      return 0;
    }
  } catch (error) {
    console.log('❌ 获取未读通知数量请求失败:', error.response?.data?.message || error.message);
    return 0;
  }
}

// 测试标记通知为已读
async function testMarkAsRead(notificationId) {
  try {
    console.log('\n✅ 测试标记通知为已读...');
    const response = await axios.put(`${API_BASE}/notifications/${notificationId}/read`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 通知标记为已读成功');
      return true;
    } else {
      console.log('❌ 标记通知为已读失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 标记通知为已读请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试批量标记通知为已读
async function testMarkMultipleAsRead(notificationIds) {
  try {
    console.log('\n✅ 测试批量标记通知为已读...');
    const response = await axios.put(`${API_BASE}/notifications/mark-read`, {
      notificationIds: notificationIds
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 批量标记通知为已读成功');
      console.log(`   - 更新数量: ${response.data.data.updatedCount}`);
      return true;
    } else {
      console.log('❌ 批量标记通知为已读失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 批量标记通知为已读请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试获取通知统计
async function testGetNotificationStatistics() {
  try {
    console.log('\n📊 测试获取通知统计...');
    const response = await axios.get(`${API_BASE}/notifications/statistics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { days: 30 }
    });
    
    if (response.data.success) {
      console.log('✅ 获取通知统计成功');
      const stats = response.data.data;
      console.log('📊 统计结果:');
      console.log(`   - 总通知数: ${stats.totalNotifications}`);
      console.log(`   - 未读通知: ${stats.unreadCount}`);
      console.log(`   - 已读通知: ${stats.readCount}`);
      console.log(`   - 已归档通知: ${stats.archivedCount}`);
      
      console.log('   - 按类型分布:');
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`     * ${type}: ${count}`);
      });
      
      console.log('   - 按分类分布:');
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.log(`     * ${category}: ${count}`);
      });
      
      console.log('   - 按优先级分布:');
      Object.entries(stats.byPriority).forEach(([priority, count]) => {
        console.log(`     * ${priority}: ${count}`);
      });
      
      if (stats.recentActivity.length > 0) {
        console.log('   - 最近活动:');
        stats.recentActivity.slice(-5).forEach(activity => {
          console.log(`     * ${activity.date}: ${activity.count}条`);
        });
      }
      
      return true;
    } else {
      console.log('❌ 获取通知统计失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取通知统计请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试获取通知设置
async function testGetNotificationSettings() {
  try {
    console.log('\n⚙️ 测试获取通知设置...');
    const response = await axios.get(`${API_BASE}/notifications/settings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 获取通知设置成功');
      const settings = response.data.data;
      console.log('⚙️ 当前设置:');
      console.log(`   - 应用内通知: ${settings.inApp.enabled ? '开启' : '关闭'}`);
      console.log(`   - 邮件通知: ${settings.email.enabled ? '开启' : '关闭'}`);
      console.log(`   - 推送通知: ${settings.push.enabled ? '开启' : '关闭'}`);
      
      if (settings.email.enabled) {
        console.log(`   - 邮件频率: ${settings.email.frequency}`);
      }
      
      return true;
    } else {
      console.log('❌ 获取通知设置失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取通知设置请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试发送测试通知
async function testSendTestNotification() {
  try {
    console.log('\n🧪 测试发送测试通知...');
    const response = await axios.post(`${API_BASE}/notifications/test`, {
      includeEmail: false,
      includePush: false
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 测试通知发送成功');
      console.log(`   - 通知ID: ${response.data.data._id}`);
      console.log(`   - 标题: ${response.data.data.title}`);
      console.log(`   - 应用内通知: ${response.data.data.channels.inApp.sent ? '已发送' : '待发送'}`);
      return response.data.data._id;
    } else {
      console.log('❌ 发送测试通知失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 发送测试通知请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 测试删除通知
async function testDeleteNotification(notificationId) {
  try {
    console.log('\n🗑️ 测试删除通知...');
    const response = await axios.delete(`${API_BASE}/notifications/${notificationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 通知删除成功');
      return true;
    } else {
      console.log('❌ 删除通知失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 删除通知请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试通过提醒系统创建通知
async function testAlertTriggeredNotification() {
  try {
    console.log('\n🚨 测试通过提醒系统创建通知...');
    
    // 首先创建一个提醒规则
    const ruleData = {
      name: '测试通知集成规则',
      description: '用于测试通知系统集成的提醒规则',
      petId: testPetId,
      triggers: {
        anomalyTypes: ['health_decline'],
        severityLevels: ['medium', 'high'],
        minimumConfidence: 60
      },
      notifications: {
        inApp: true,
        email: false
      },
      frequency: {
        maxPerDay: 5,
        maxPerWeek: 10,
        cooldownHours: 1
      }
    };
    
    const ruleResponse = await axios.post(`${API_BASE}/alerts/rules`, ruleData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (ruleResponse.data.success) {
      console.log('✅ 提醒规则创建成功');
      
      // 触发提醒检查
      const triggerResponse = await axios.post(`${API_BASE}/alerts/trigger/${testPetId}`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (triggerResponse.data.success) {
        console.log('✅ 提醒检查完成');
        console.log(`   - 触发的提醒数量: ${triggerResponse.data.data.totalTriggered}`);
        
        if (triggerResponse.data.data.triggeredAlerts.length > 0) {
          console.log('🚨 触发的提醒已创建通知');
          
          // 检查是否有新的通知
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
          const notifications = await testGetNotifications();
          
          return true;
        } else {
          console.log('   - 没有触发提醒，这是正常的（可能没有检测到异常）');
          return true;
        }
      } else {
        console.log('❌ 提醒检查失败:', triggerResponse.data.message);
        return false;
      }
    } else {
      console.log('❌ 创建提醒规则失败:', ruleResponse.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 测试提醒系统集成失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🧪 开始通知系统测试\n');
  
  // 登录
  if (!await login()) {
    console.log('❌ 登录失败，终止测试');
    return;
  }
  
  // 获取宠物
  if (!await getPets()) {
    console.log('❌ 获取宠物失败，终止测试');
    return;
  }
  
  // 测试创建通知
  const notificationId = await testCreateNotification();
  
  // 测试获取通知列表
  const notifications = await testGetNotifications();
  
  // 测试获取未读通知数量
  await testGetUnreadCount();
  
  // 测试标记通知为已读
  if (notificationId) {
    await testMarkAsRead(notificationId);
  }
  
  // 测试批量标记通知为已读
  if (notifications.length > 0) {
    const notificationIds = notifications.slice(0, 2).map(n => n._id);
    await testMarkMultipleAsRead(notificationIds);
  }
  
  // 测试获取通知统计
  await testGetNotificationStatistics();
  
  // 测试获取通知设置
  await testGetNotificationSettings();
  
  // 测试发送测试通知
  const testNotificationId = await testSendTestNotification();
  
  // 测试通过提醒系统创建通知
  await testAlertTriggeredNotification();
  
  // 测试删除通知
  if (testNotificationId) {
    await testDeleteNotification(testNotificationId);
  }
  
  console.log('\n✅ 通知系统测试完成');
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试过程中发生错误:', error.message);
});