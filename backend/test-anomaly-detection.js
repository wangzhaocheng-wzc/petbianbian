const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

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

// 测试异常检测
async function testAnomalyDetection() {
  try {
    console.log('\n🔍 测试异常检测...');
    const response = await axios.get(`${API_BASE}/alerts/anomalies/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        analysisWindow: 14,
        baselineWindow: 30
      }
    });
    
    if (response.data.success) {
      console.log('✅ 异常检测成功');
      console.log('📊 检测结果:');
      console.log(`   - 发现异常: ${response.data.data.anomalies.length}个`);
      console.log(`   - 总体风险等级: ${response.data.data.summary.overallRiskLevel}`);
      console.log(`   - 高严重度异常: ${response.data.data.summary.highSeverityCount}个`);
      console.log(`   - 中等严重度异常: ${response.data.data.summary.mediumSeverityCount}个`);
      console.log(`   - 低严重度异常: ${response.data.data.summary.lowSeverityCount}个`);
      
      if (response.data.data.anomalies.length > 0) {
        console.log('\n📋 异常详情:');
        response.data.data.anomalies.forEach((anomaly, index) => {
          console.log(`   ${index + 1}. ${anomaly.anomalyType} (${anomaly.severity})`);
          console.log(`      描述: ${anomaly.description}`);
          console.log(`      置信度: ${anomaly.confidence}%`);
          console.log(`      建议: ${anomaly.recommendations.slice(0, 2).join(', ')}`);
        });
      }
      
      return true;
    } else {
      console.log('❌ 异常检测失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 异常检测请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试健康模式分析
async function testHealthPattern() {
  try {
    console.log('\n📈 测试健康模式分析...');
    const response = await axios.get(`${API_BASE}/alerts/health-pattern/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { days: 30 }
    });
    
    if (response.data.success) {
      console.log('✅ 健康模式分析成功');
      const pattern = response.data.data;
      console.log('📊 模式分析结果:');
      console.log(`   - 平均频率: ${pattern.averageFrequency.toFixed(1)}次/周`);
      console.log(`   - 主导健康状态: ${pattern.dominantHealthStatus}`);
      console.log(`   - 健康状态分布:`);
      console.log(`     * 健康: ${pattern.healthStatusDistribution.healthy}次`);
      console.log(`     * 警告: ${pattern.healthStatusDistribution.warning}次`);
      console.log(`     * 异常: ${pattern.healthStatusDistribution.concerning}次`);
      console.log(`   - 时间模式:`);
      console.log(`     * 上午: ${pattern.timePatterns.morningCount}次`);
      console.log(`     * 下午: ${pattern.timePatterns.afternoonCount}次`);
      console.log(`     * 晚上: ${pattern.timePatterns.eveningCount}次`);
      
      return true;
    } else {
      console.log('❌ 健康模式分析失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 健康模式分析请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试创建提醒规则
async function testCreateAlertRule() {
  try {
    console.log('\n⚠️ 测试创建提醒规则...');
    const ruleData = {
      name: '测试健康警告规则',
      description: '用于测试的健康状态恶化警告规则',
      petId: testPetId,
      triggers: {
        anomalyTypes: ['health_decline', 'frequency'],
        severityLevels: ['medium', 'high'],
        minimumConfidence: 70
      },
      notifications: {
        inApp: true,
        email: false
      },
      frequency: {
        maxPerDay: 2,
        maxPerWeek: 5,
        cooldownHours: 6
      }
    };
    
    const response = await axios.post(`${API_BASE}/alerts/rules`, ruleData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 提醒规则创建成功');
      console.log(`   - 规则ID: ${response.data.data._id}`);
      console.log(`   - 规则名称: ${response.data.data.name}`);
      console.log(`   - 异常类型: ${response.data.data.triggers.anomalyTypes.join(', ')}`);
      console.log(`   - 严重程度: ${response.data.data.triggers.severityLevels.join(', ')}`);
      return response.data.data._id;
    } else {
      console.log('❌ 创建提醒规则失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 创建提醒规则请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 测试获取提醒规则列表
async function testGetAlertRules() {
  try {
    console.log('\n📋 测试获取提醒规则列表...');
    const response = await axios.get(`${API_BASE}/alerts/rules`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { petId: testPetId }
    });
    
    if (response.data.success) {
      console.log('✅ 获取提醒规则成功');
      console.log(`   - 规则数量: ${response.data.data.total}`);
      
      if (response.data.data.rules.length > 0) {
        console.log('📋 规则列表:');
        response.data.data.rules.forEach((rule, index) => {
          console.log(`   ${index + 1}. ${rule.name}`);
          console.log(`      状态: ${rule.isActive ? '激活' : '禁用'}`);
          console.log(`      触发次数: ${rule.stats.totalTriggered}`);
          console.log(`      通知次数: ${rule.stats.totalNotificationsSent}`);
        });
      }
      
      return true;
    } else {
      console.log('❌ 获取提醒规则失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取提醒规则请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试手动触发提醒检查
async function testTriggerAlert() {
  try {
    console.log('\n🚨 测试手动触发提醒检查...');
    const response = await axios.post(`${API_BASE}/alerts/trigger/${testPetId}`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 提醒检查完成');
      console.log(`   - 触发的提醒数量: ${response.data.data.totalTriggered}`);
      
      if (response.data.data.triggeredAlerts.length > 0) {
        console.log('🚨 触发的提醒:');
        response.data.data.triggeredAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.ruleName}`);
          console.log(`      异常类型: ${alert.anomaly.anomalyType}`);
          console.log(`      严重程度: ${alert.anomaly.severity}`);
          console.log(`      描述: ${alert.anomaly.description}`);
          console.log(`      通知发送: 应用内=${alert.notificationsSent.inApp}, 邮件=${alert.notificationsSent.email}`);
        });
      } else {
        console.log('   - 没有触发任何提醒');
      }
      
      return true;
    } else {
      console.log('❌ 提醒检查失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 提醒检查请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试获取提醒统计
async function testAlertStatistics() {
  try {
    console.log('\n📊 测试获取提醒统计...');
    const response = await axios.get(`${API_BASE}/alerts/statistics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { days: 30 }
    });
    
    if (response.data.success) {
      console.log('✅ 获取提醒统计成功');
      const stats = response.data.data;
      console.log('📊 统计结果:');
      console.log(`   - 总规则数: ${stats.totalRules}`);
      console.log(`   - 活跃规则数: ${stats.activeRules}`);
      console.log(`   - 总触发次数: ${stats.totalTriggered}`);
      console.log(`   - 总通知次数: ${stats.totalNotificationsSent}`);
      console.log(`   - 最近触发: ${stats.recentTriggers.length}次`);
      
      return true;
    } else {
      console.log('❌ 获取提醒统计失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取提醒统计请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试获取提醒规则模板
async function testAlertTemplates() {
  try {
    console.log('\n📝 测试获取提醒规则模板...');
    const response = await axios.get(`${API_BASE}/alerts/templates`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 获取提醒规则模板成功');
      console.log(`   - 模板数量: ${response.data.data.total}`);
      
      console.log('📝 可用模板:');
      response.data.data.templates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.category})`);
        console.log(`      描述: ${template.description}`);
        console.log(`      异常类型: ${template.triggers.anomalyTypes.join(', ')}`);
      });
      
      return true;
    } else {
      console.log('❌ 获取提醒规则模板失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取提醒规则模板请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🧪 开始异常检测和智能提醒系统测试\n');
  
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
  
  // 测试异常检测
  await testAnomalyDetection();
  
  // 测试健康模式分析
  await testHealthPattern();
  
  // 测试提醒规则模板
  await testAlertTemplates();
  
  // 测试创建提醒规则
  const ruleId = await testCreateAlertRule();
  
  // 测试获取提醒规则列表
  await testGetAlertRules();
  
  // 测试手动触发提醒检查
  await testTriggerAlert();
  
  // 测试获取提醒统计
  await testAlertStatistics();
  
  console.log('\n✅ 异常检测和智能提醒系统测试完成');
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试过程中发生错误:', error.message);
});