const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:5000/api';
const AVG_DIFF_THRESHOLD_PT = parseFloat(process.env.AVG_DIFF_THRESHOLD_PT || '2');

// 测试用户凭据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';
let authUserId = '';
let testPetId = '';

// 登录获取token
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE}/auth/login`, testUser);
    
    if (response.data.success) {
      // 修正令牌字段：使用 access_token
      authToken = response.data.data.tokens.access_token;
      authUserId = response.data.data.user?.id || '';
      console.log('✅ 登录成功');
      return true;
    } else {
      console.log('⚠️ 登录失败:', response.data.message);
    }
  } catch (error) {
    console.log('⚠️ 登录请求失败:', error.response?.data?.message || error.message);
  }

  // 自动注册并重试登录
  try {
    console.log('🆕 尝试自动注册测试用户并重试登录...');
    const uniq = Date.now();
    const newEmail = `auto_test_${uniq}@example.com`;
    const newUsername = `autoUser_${uniq}`;
    const password = testUser.password;

    const regResp = await axios.post(`${API_BASE}/auth/register`, {
      username: newUsername,
      email: newEmail,
      password
    });

    if (!regResp.data?.success) {
      console.log('❌ 自动注册失败:', regResp.data?.message || '未知错误');
      return false;
    }

    // 使用新用户凭据登录
    testUser.email = newEmail;
    const loginResp = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password
    });

    if (loginResp.data?.success) {
      authToken = loginResp.data.data.tokens.access_token;
      authUserId = loginResp.data.data.user?.id || '';
      console.log('✅ 自动注册后登录成功');
      return true;
    } else {
      console.log('❌ 自动注册后登录仍失败:', loginResp.data?.message || '未知错误');
      return false;
    }
  } catch (e) {
    console.log('❌ 自动注册或重试登录失败:', e.response?.data?.message || e.message);
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

    if (response.data.success) {
      const pets = response.data.data.pets || [];
      const total = response.data.data.total ?? pets.length;

      if (pets.length === 0) {
        console.log('⚠️ 当前无宠物，尝试创建测试宠物...');
        const createResp = await axios.post(
          `${API_BASE}/pets`,
          {
            name: `TestPet-${Date.now() % 100000}`,
            type: 'dog',
            breed: 'Golden Retriever',
            gender: 'male',
            age: 24,
            weight: 25.5,
            description: '自动化测试宠物'
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (!createResp.data.success) {
          console.log('❌ 创建测试宠物失败:', createResp.data.message);
          return false;
        }
        console.log('✅ 已创建测试宠物:', createResp.data.data.name);
        // 再次获取列表
        const listAgain = await axios.get(`${API_BASE}/pets`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!listAgain.data.success || (listAgain.data.data.pets || []).length === 0) {
          console.log('❌ 创建后仍未获取到宠物列表');
          return false;
        }
        const petsAfterCreate = listAgain.data.data.pets;
        testPetId = petsAfterCreate[0].id;
        // 基本校验
        const ownMismatch = petsAfterCreate.filter(p => p.ownerId && authUserId && p.ownerId !== authUserId);
        if (ownMismatch.length > 0) {
          console.log('⚠️ 发现非当前用户的宠物条目，可能存在权限问题');
        }
        console.log(`✅ 获取宠物成功（总数: ${petsAfterCreate.length}）:`, petsAfterCreate[0].name);
        return true;
      }

      // 列表非空，进行字段校验
      const invalid = pets.filter(p => !p.id || !p.name);
      if (invalid.length > 0) {
        console.log('⚠️ 宠物列表存在缺失关键字段的条目');
      }
      const ownMismatch = pets.filter(p => p.ownerId && authUserId && p.ownerId !== authUserId);
      if (ownMismatch.length > 0) {
        console.log('⚠️ 发现非当前用户的宠物条目，可能存在权限问题');
      }

      testPetId = pets[0].id;
      console.log(`✅ 获取宠物成功（总数: ${total}）:`, pets[0].name);
      return true;
    } else {
      console.log('❌ 获取宠物失败:', response.data.message);
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
      const data = response.data.data;
      const { anomalies, summary } = data;
      console.log('📊 检测结果:');
      console.log(`   - 发现异常: ${anomalies.length}个`);
      console.log(`   - 总体风险等级: ${summary?.overallRiskLevel}`);
      console.log(`   - 高严重度异常: ${summary?.highSeverityCount}个`);
      console.log(`   - 中等严重度异常: ${summary?.mediumSeverityCount}个`);
      console.log(`   - 低严重度异常: ${summary?.lowSeverityCount}个`);

      // 输出结构校验
      if (!Array.isArray(anomalies)) {
        console.log('❌ 返回的 anomalies 不是数组');
        return false;
      }
      if (!summary || typeof summary !== 'object') {
        console.log('❌ 返回的 summary 缺失或类型错误');
      } else {
        const required = ['overallRiskLevel','highSeverityCount','mediumSeverityCount','lowSeverityCount'];
        required.forEach((f) => {
          if (!(f in summary)) console.log(`⚠️ summary 缺少字段: ${f}`);
        });
        ['highSeverityCount','mediumSeverityCount','lowSeverityCount'].forEach((f) => {
          if (typeof summary[f] !== 'number') console.log(`⚠️ summary.${f} 不是数字`);
        });
        if (typeof summary.overallRiskLevel !== 'string') console.log('⚠️ summary.overallRiskLevel 不是字符串');
      }

      if (anomalies.length > 0) {
        console.log('\n📋 异常详情:');
        anomalies.forEach((anomaly, index) => {
          console.log(`   ${index + 1}. ${anomaly.anomalyType} (${anomaly.severity})`);
          console.log(`      描述: ${anomaly.description}`);
          console.log(`      置信度: ${anomaly.confidence}%`);
          console.log(`      建议: ${Array.isArray(anomaly.recommendations) ? anomaly.recommendations.slice(0, 2).join(', ') : '无'}`);

          // 单条异常结构校验
          if (typeof anomaly.anomalyType !== 'string') console.log(`⚠️ 第${index+1}条 anomalyType 非字符串`);
          if (typeof anomaly.severity !== 'string') console.log(`⚠️ 第${index+1}条 severity 非字符串`);
          if (typeof anomaly.description !== 'string') console.log(`⚠️ 第${index+1}条 description 非字符串`);
          if (typeof anomaly.confidence !== 'number') console.log(`⚠️ 第${index+1}条 confidence 非数字`);
          if (!Array.isArray(anomaly.recommendations)) console.log(`⚠️ 第${index+1}条 recommendations 非数组`);
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

// 新增：统计异常模式检测
async function testStatisticsAnomalies() {
  try {
    console.log('\n🧠 测试统计异常模式接口...');
    const response = await axios.get(`${API_BASE}/statistics/anomalies/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { window: 30 }
    });

    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ 统计异常模式获取成功');
      console.log('📊 统计结果:');
      console.log(`   - 宠物: ${data.petName} (${data.petId})`);
      console.log(`   - 分析窗口: ${data.analysisWindow}天`);
      console.log(`   - 异常数量: ${data.anomaliesCount}`);
      console.log(`   - 高/中/低严重度: ${data.highSeverityCount}/${data.mediumSeverityCount}/${data.lowSeverityCount}`);

      // 基本结构校验
      if (!Array.isArray(data.anomalies)) {
        console.log('❌ 返回的 anomalies 不是数组');
        return false;
      }
      if (typeof data.anomaliesCount === 'number' && data.anomaliesCount !== data.anomalies.length) {
        console.log('⚠️ anomaliesCount 与 anomalies.length 不一致');
      }
      return true;
    } else {
      console.log('❌ 统计异常模式获取失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 统计异常模式请求失败:', error.response?.data?.message || error.message);
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

      // 结构校验
      let ok = true;
      if (typeof pattern.averageFrequency !== 'number') {
        console.log('❌ averageFrequency 类型应为 number');
        ok = false;
      }
      if (typeof pattern.dominantHealthStatus !== 'string') {
        console.log('❌ dominantHealthStatus 类型应为 string');
        ok = false;
      }
      const hsd = pattern.healthStatusDistribution || {};
      ['healthy','warning','concerning'].forEach(k => {
        if (typeof hsd[k] !== 'number') console.log(`⚠️ healthStatusDistribution.${k} 类型应为 number`);
      });
      const tp = pattern.timePatterns || {};
      ['morningCount','afternoonCount','eveningCount'].forEach(k => {
        if (typeof tp[k] !== 'number') console.log(`⚠️ timePatterns.${k} 类型应为 number`);
      });
      if (!pattern.consistencyPattern || typeof pattern.consistencyPattern !== 'object') {
        console.log('⚠️ consistencyPattern 缺失或类型异常');
      }
      return ok;
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

      // 结构校验
      let ok = true;
      ['totalRules','activeRules','totalTriggered','totalNotificationsSent'].forEach(k => {
        if (typeof stats[k] !== 'number') {
          console.log(`❌ ${k} 类型应为 number`);
          ok = false;
        }
      });
      if (typeof stats.activeRules === 'number' && typeof stats.totalRules === 'number' && stats.activeRules > stats.totalRules) {
        console.log('⚠️ activeRules 大于 totalRules，可能不合理');
      }

      if (!Array.isArray(stats.recentTriggers)) {
        console.log('❌ recentTriggers 不是数组');
        return false;
      }
      stats.recentTriggers.forEach((rt, idx) => {
        if (typeof rt.ruleName !== 'string') console.log(`⚠️ 第${idx+1}条 recentTriggers.ruleName 类型应为 string`);
        const t = rt.triggeredAt;
        if (!(typeof t === 'string' || t instanceof Date)) console.log(`⚠️ 第${idx+1}条 recentTriggers.triggeredAt 类型应为 string/Date`);
        if (typeof rt.anomalyType !== 'string') console.log(`⚠️ 第${idx+1}条 recentTriggers.anomalyType 类型应为 string`);
        if (typeof rt.severity !== 'string') console.log(`⚠️ 第${idx+1}条 recentTriggers.severity 类型应为 string`);
      });

      if (!Array.isArray(stats.rulePerformance)) {
        console.log('❌ rulePerformance 不是数组');
        return false;
      }
      stats.rulePerformance.forEach((rp, idx) => {
        if (typeof rp.ruleName !== 'string') console.log(`⚠️ 第${idx+1}条 rulePerformance.ruleName 类型应为 string`);
        if (typeof rp.totalTriggered !== 'number') console.log(`⚠️ 第${idx+1}条 rulePerformance.totalTriggered 类型应为 number`);
        if (typeof rp.isActive !== 'boolean') console.log(`⚠️ 第${idx+1}条 rulePerformance.isActive 类型应为 boolean`);
        const lt = rp.lastTriggered;
        if (lt != null && !(typeof lt === 'string' || lt instanceof Date)) console.log(`⚠️ 第${idx+1}条 rulePerformance.lastTriggered 类型应为 string/Date 或 undefined`);
      });

      return ok;
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

  // 新增：测试统计异常模式接口
  await testStatisticsAnomalies();

  // 测试健康模式分析
  await testHealthPattern();

  // 新增：测试健康趋势（daily/weekly）
  await testHealthTrends('daily');
  await testHealthTrends('weekly');

  // 新增：测试周期统计（week/month/quarter/year）
  await testPeriodStatistics('week');
  await testPeriodStatistics('month');
  await testPeriodStatistics('quarter');
  await testPeriodStatistics('year');

  // 新增：测试多宠物汇总（month）
  await testMultiPetSummary('month');

  // 新增：测试用户概览
  await testUserOverview();

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

async function testHealthTrends(granularity = 'daily') {
  try {
    console.log(`\n📈 测试健康趋势（${granularity}）...`);
    const days = 30;
    const response = await axios.get(`${API_BASE}/statistics/trends/health/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { days, granularity }
    });

    if (!response.data?.success) {
      console.log('❌ 获取健康趋势失败:', response.data?.message);
      return false;
    }

    const data = response.data.data;
    console.log('✅ 获取健康趋势成功');
    console.log(`   - 宠物: ${data.petName} (${data.petId})`);
    console.log(`   - 时间范围: ${data.days}天, 粒度: ${data.granularity}`);

    let ok = true;
    if (data.petId !== testPetId) console.log('⚠️ 返回的 petId 与请求不一致');
    if (typeof data.petName !== 'string') { console.log('❌ petName 类型应为 string'); ok = false; }
    if (typeof data.days !== 'number') { console.log('❌ days 类型应为 number'); ok = false; }
    if (!['daily','weekly'].includes(data.granularity)) { console.log('❌ granularity 值应为 daily/weekly'); ok = false; }
    if (!Array.isArray(data.trends)) { console.log('❌ trends 不是数组'); return false; }

    let lastDate = null;
    data.trends.forEach((tp, idx) => {
      const path = `第${idx+1}个趋势点`;
      if (typeof tp.date !== 'string') { console.log(`❌ ${path} date 类型应为 string`); ok = false; }
      else {
        const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(tp.date);
        if (!dateOk) console.log(`⚠️ ${path} date 格式非 YYYY-MM-DD: ${tp.date}`);
      }
      ['healthy','warning','concerning','total','healthyPercentage','warningPercentage','concerningPercentage'].forEach(k => {
        if (typeof tp[k] !== 'number') { console.log(`❌ ${path} ${k} 类型应为 number`); ok = false; }
      });

      const counts = [tp.healthy, tp.warning, tp.concerning];
      if (counts.some(v => v < 0)) console.log(`❌ ${path} 计数存在负数`);
      if (!Number.isInteger(tp.healthy) || !Number.isInteger(tp.warning) || !Number.isInteger(tp.concerning)) {
        console.log(`⚠️ ${path} 计数应为整数`);
      }

      const sum = tp.healthy + tp.warning + tp.concerning;
      if (tp.total !== sum) console.log(`❌ ${path} total(${tp.total}) ≠ healthy+warning+concerning(${sum})`);

      ['healthyPercentage','warningPercentage','concerningPercentage'].forEach(k => {
        if (tp[k] < 0 || tp[k] > 100) console.log(`❌ ${path} ${k} 超出范围 [0,100]: ${tp[k]}`);
      });

      if (tp.total === 0) {
        if (tp.healthyPercentage !== 0 || tp.warningPercentage !== 0 || tp.concerningPercentage !== 0) {
          console.log(`❌ ${path} total=0 时百分比应全为 0`);
        }
      } else {
        const expectedHealthy = Math.round((tp.healthy / tp.total) * 100);
        const expectedWarning = Math.round((tp.warning / tp.total) * 100);
        const expectedConcerning = Math.round((tp.concerning / tp.total) * 100);
        if (tp.healthyPercentage !== expectedHealthy) console.log(`⚠️ ${path} healthyPercentage(${tp.healthyPercentage}) != 期望(${expectedHealthy})`);
        if (tp.warningPercentage !== expectedWarning) console.log(`⚠️ ${path} warningPercentage(${tp.warningPercentage}) != 期望(${expectedWarning})`);
        if (tp.concerningPercentage !== expectedConcerning) console.log(`⚠️ ${path} concerningPercentage(${tp.concerningPercentage}) != 期望(${expectedConcerning})`);
        const sumPercent = tp.healthyPercentage + tp.warningPercentage + tp.concerningPercentage;
        if (sumPercent < 98 || sumPercent > 102) {
          console.log(`⚠️ ${path} 百分比和(${sumPercent}) 不在 98-102 范围（四舍五入误差允许）`);
        }
      }

      if (lastDate && tp.date < lastDate) {
        console.log(`⚠️ ${path} 日期非升序: ${tp.date} < ${lastDate}`);
      }
      lastDate = tp.date;
    });

    if (data.trends.length > 0) {
      const first = data.trends[0];
      console.log(`📍 示例趋势点: ${first.date} total=${first.total}, H:${first.healthy}/${first.healthyPercentage}% W:${first.warning}/${first.warningPercentage}% C:${first.concerning}/${first.concerningPercentage}%`);
    } else {
      console.log('ℹ️ 当前时间范围内无趋势数据');
    }

    return ok;
  } catch (error) {
    console.log('❌ 健康趋势请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testPeriodStatistics(period = 'month') {
  try {
    console.log(`\n📊 测试周期统计（${period}）...`);
    const response = await axios.get(`${API_BASE}/statistics/period/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { period }
    });

    if (!response.data?.success) {
      console.log('❌ 获取周期统计失败:', response.data?.message);
      return false;
    }

    const d = response.data.data;
    console.log('✅ 周期统计获取成功');
    console.log(`   - 宠物: ${d.petName} (${d.petId})`);
    console.log(`   - 周期: ${d.period}, 日期: ${d.startDate} ~ ${d.endDate}`);
    console.log(`   - 总记录: ${d.totalRecords}, 每周频率: ${d.frequencyPerWeek}`);

    let ok = true;
    if (d.petId !== testPetId) { console.log('⚠️ 返回的 petId 与请求不一致'); ok = false; }
    if (d.period !== period) { console.log('⚠️ period 与请求不一致'); ok = false; }
    if (typeof d.petName !== 'string') { console.log('❌ petName 类型应为 string'); ok = false; }

    // 日期校验
    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) { console.log('❌ startDate/endDate 非有效日期'); ok = false; }
    else if (start.getTime() > end.getTime()) { console.log('❌ startDate 晚于 endDate'); ok = false; }

    // 数值类型校验
    ['totalRecords','healthyCount','warningCount','concerningCount','healthyPercentage','warningPercentage','concerningPercentage','averageConfidence','frequencyPerWeek'].forEach(k => {
      if (typeof d[k] !== 'number') { console.log(`❌ ${k} 类型应为 number`); ok = false; }
    });

    // 计数非负整数校验
    ['healthyCount','warningCount','concerningCount','totalRecords'].forEach(k => {
      if (!Number.isInteger(d[k]) || d[k] < 0) { console.log(`❌ ${k} 应为非负整数: ${d[k]}`); ok = false; }
    });

    // 计数求和一致性
    const sumCounts = d.healthyCount + d.warningCount + d.concerningCount;
    if (d.totalRecords !== sumCounts) { console.log(`❌ totalRecords(${d.totalRecords}) ≠ 三类计数和(${sumCounts})`); ok = false; }

    // 百分比范围与一致性
    ['healthyPercentage','warningPercentage','concerningPercentage'].forEach(k => {
      if (d[k] < 0 || d[k] > 100) { console.log(`❌ ${k} 超出范围 [0,100]: ${d[k]}`); ok = false; }
    });
    if (d.totalRecords === 0) {
      if (d.healthyPercentage !== 0 || d.warningPercentage !== 0 || d.concerningPercentage !== 0) {
        console.log('❌ totalRecords=0 时百分比应为 0');
        ok = false;
      }
    } else {
      const expectedH = Math.round((d.healthyCount / d.totalRecords) * 100);
      const expectedW = Math.round((d.warningCount / d.totalRecords) * 100);
      const expectedC = Math.round((d.concerningCount / d.totalRecords) * 100);
      if (d.healthyPercentage !== expectedH) console.log(`⚠️ healthyPercentage(${d.healthyPercentage}) != 期望(${expectedH})`);
      if (d.warningPercentage !== expectedW) console.log(`⚠️ warningPercentage(${d.warningPercentage}) != 期望(${expectedW})`);
      if (d.concerningPercentage !== expectedC) console.log(`⚠️ concerningPercentage(${d.concerningPercentage}) != 期望(${expectedC})`);
      const sumPct = d.healthyPercentage + d.warningPercentage + d.concerningPercentage;
      if (sumPct < 98 || sumPct > 102) console.log(`⚠️ 百分比和(${sumPct}) 不在 98-102 范围`);
    }

    if (d.averageConfidence < 0 || d.averageConfidence > 100) { console.log(`❌ averageConfidence 超出范围 [0,100]: ${d.averageConfidence}`); ok = false; }
    if (d.frequencyPerWeek < 0) { console.log(`❌ frequencyPerWeek 不能为负数: ${d.frequencyPerWeek}`); ok = false; }

    // 形状分布与症状频率
    ['shapeDistribution','symptomsFrequency'].forEach(objKey => {
      const obj = d[objKey];
      if (typeof obj !== 'object' || obj === null) { console.log(`❌ ${objKey} 类型应为对象`); ok = false; }
      else {
        Object.entries(obj).forEach(([key, val]) => {
          if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
            console.log(`❌ ${objKey}.${key} 应为非负整数: ${val}`);
            ok = false;
          }
        });
      }
    });

    return ok;
  } catch (error) {
    console.log('❌ 周期统计请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testMultiPetSummary(period = 'month') {
  try {
    console.log(`\n🐾 测试多宠物汇总（${period}）...`);
    const resp = await axios.get(`${API_BASE}/statistics/summary/multi-pet`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { period }
    });

    if (!resp.data?.success) {
      console.log('❌ 获取多宠物汇总失败:', resp.data?.message);
      return false;
    }

    const d = resp.data.data;
    console.log('✅ 多宠物汇总获取成功');
    console.log(`   - 总宠物: ${d.totalPets}, 活跃宠物: ${d.activePets}`);

    let ok = true;
    if (typeof d.totalPets !== 'number' || d.totalPets < 0) { console.log('❌ totalPets 应为非负数'); ok = false; }
    if (typeof d.activePets !== 'number' || d.activePets < 0) { console.log('❌ activePets 应为非负数'); ok = false; }
    if (d.activePets > d.totalPets) { console.log('⚠️ activePets 不应超过 totalPets'); }

    if (!Array.isArray(d.petSummaries)) { console.log('❌ petSummaries 不是数组'); ok = false; }
    else {
      const petStatEntries = [];
      d.petSummaries.forEach((s, idx) => {
        const path = `第${idx+1}个宠物汇总`;
        if (!s.petId) { console.log(`❌ ${path} 缺少 petId`); ok = false; }
        if (typeof s.petName !== 'string') { console.log(`❌ ${path} petName 类型应为 string`); ok = false; }
        if (typeof s.petType !== 'string') { console.log(`⚠️ ${path} petType 类型应为 string`); }
        if (typeof s.petBreed !== 'string') { console.log(`⚠️ ${path} petBreed 类型应为 string`); }
        if (s.petAvatar !== null && typeof s.petAvatar !== 'string') { console.log(`⚠️ ${path} petAvatar 类型应为 string 或 null`); }

        if (typeof s.anomaliesCount !== 'number' || !Number.isInteger(s.anomaliesCount) || s.anomaliesCount < 0) {
          console.log(`❌ ${path} anomaliesCount 应为非负整数`); ok = false;
        }
        if (typeof s.highSeverityAnomalies !== 'number' || !Number.isInteger(s.highSeverityAnomalies) || s.highSeverityAnomalies < 0) {
          console.log(`❌ ${path} highSeverityAnomalies 应为非负整数`); ok = false;
        }
        if (s.highSeverityAnomalies > s.anomaliesCount) { console.log(`⚠️ ${path} 高严重度异常不应超过总异常数`); }

        if (s.lastAnalyzed !== null) {
          const la = new Date(s.lastAnalyzed);
          if (isNaN(la.getTime())) { console.log(`⚠️ ${path} lastAnalyzed 非有效日期`); }
        }

        if (s.statistics !== null) {
          const st = s.statistics;
          ['period','totalRecords','healthyCount','warningCount','concerningCount','healthyPercentage','warningPercentage','concerningPercentage','averageConfidence','frequencyPerWeek'].forEach(k => {
            if (!(k in st)) { console.log(`❌ ${path}.statistics 缺少字段 ${k}`); ok = false; }
          });
          // 周期应与请求一致
          if (st.period !== period) { console.log(`❌ ${path}.statistics.period 与请求不一致: ${st.period}`); ok = false; }
          // 计数与类型校验
          ['totalRecords','healthyCount','warningCount','concerningCount'].forEach(k => {
            if (typeof st[k] !== 'number' || !Number.isInteger(st[k]) || st[k] < 0) { console.log(`❌ ${path}.statistics.${k} 应为非负整数`); ok = false; }
          });
          ['healthyPercentage','warningPercentage','concerningPercentage'].forEach(k => {
            if (typeof st[k] !== 'number' || st[k] < 0 || st[k] > 100) { console.log(`❌ ${path}.statistics.${k} 范围应在 [0,100]`); ok = false; }
          });
          // 计数求和一致性
          const sumCounts = st.healthyCount + st.warningCount + st.concerningCount;
          if (st.totalRecords !== sumCounts) { console.log(`❌ ${path}.statistics.totalRecords(${st.totalRecords}) ≠ 三类计数和(${sumCounts})`); ok = false; }
          // 百分比与计数严格匹配
          if (st.totalRecords === 0) {
            if (st.healthyPercentage !== 0 || st.warningPercentage !== 0 || st.concerningPercentage !== 0) {
              console.log(`❌ ${path}.statistics totalRecords=0 时百分比应为 0`);
              ok = false;
            }
          } else {
            const expectedH = Math.round((st.healthyCount / st.totalRecords) * 100);
            const expectedW = Math.round((st.warningCount / st.totalRecords) * 100);
            const expectedC = Math.round((st.concerningCount / st.totalRecords) * 100);
            if (st.healthyPercentage !== expectedH) { console.log(`❌ ${path}.statistics.healthyPercentage(${st.healthyPercentage}) != 计数匹配(${expectedH})`); ok = false; }
            if (st.warningPercentage !== expectedW) { console.log(`❌ ${path}.statistics.warningPercentage(${st.warningPercentage}) != 计数匹配(${expectedW})`); ok = false; }
            if (st.concerningPercentage !== expectedC) { console.log(`❌ ${path}.statistics.concerningPercentage(${st.concerningPercentage}) != 计数匹配(${expectedC})`); ok = false; }
            const sumPct = st.healthyPercentage + st.warningPercentage + st.concerningPercentage;
            const expectedSumPct = expectedH + expectedW + expectedC;
            if (sumPct !== expectedSumPct) {
              console.log(`❌ ${path}.statistics 百分比和(${sumPct}) != 期望(${expectedSumPct})`);
              ok = false;
            }
            const mismatch = (st.healthyPercentage !== expectedH) || (st.warningPercentage !== expectedW) || (st.concerningPercentage !== expectedC) || (sumPct !== expectedSumPct);
            if (mismatch) {
              console.log(`   - 百分比对照（${path}）:`);
              console.log(`     · Healthy: 实际=${st.healthyPercentage}% vs 期望=${expectedH}%（${st.healthyCount}/${st.totalRecords}）`);
              console.log(`     · Warning: 实际=${st.warningPercentage}% vs 期望=${expectedW}%（${st.warningCount}/${st.totalRecords}）`);
              console.log(`     · Concerning: 实际=${st.concerningPercentage}% vs 期望=${expectedC}%（${st.concerningCount}/${st.totalRecords}）`);
              console.log(`     · 百分比和: 实际=${sumPct}% vs 期望=${expectedSumPct}%`);
            }
            // 收集差异统计条目（用于后续排序与最大差异高亮）
            const diffH = Math.abs(st.healthyPercentage - expectedH);
            const diffW = Math.abs(st.warningPercentage - expectedW);
            const diffC = Math.abs(st.concerningPercentage - expectedC);
            petStatEntries.push({
              petId: s.petId,
              petName: s.petName,
              totalRecords: st.totalRecords,
              healthyPercentage: st.healthyPercentage,
              warningPercentage: st.warningPercentage,
              concerningPercentage: st.concerningPercentage,
              expectedH, expectedW, expectedC,
              diffScore: diffH + diffW + diffC
            });
          }
          if (typeof st.averageConfidence !== 'number' || st.averageConfidence < 0 || st.averageConfidence > 100) { console.log(`❌ ${path}.statistics.averageConfidence 范围应在 [0,100]`); ok = false; }
          if (typeof st.frequencyPerWeek !== 'number' || st.frequencyPerWeek < 0) { console.log(`❌ ${path}.statistics.frequencyPerWeek 应为非负数`); ok = false; }
        }
      });
    }

    // 输出按记录量排序的宠物列表，并高亮差异最大的宠物
    if (petStatEntries.length > 0) {
      const sortedByRecords = petStatEntries.slice().sort((a, b) => b.totalRecords - a.totalRecords);
      console.log('   - 宠物记录量排序（前10）:');
      sortedByRecords.slice(0, 10).forEach((e, i) => {
        console.log(`     ${i + 1}. ${e.petName}(${e.petId}) 记录=${e.totalRecords} H=${e.healthyPercentage}%/${e.expectedH}% W=${e.warningPercentage}%/${e.expectedW}% C=${e.concerningPercentage}%/${e.expectedC}% 差异分=${e.diffScore}`);
      });

      const maxDiffEntry = petStatEntries.reduce((max, e) => (max && max.diffScore >= e.diffScore) ? max : e, null);
      if (maxDiffEntry && maxDiffEntry.diffScore > 0) {
        console.log(`   ⚠️ 差异最大宠物: ${maxDiffEntry.petName}(${maxDiffEntry.petId}) 记录=${maxDiffEntry.totalRecords}`);
        console.log(`     · Healthy: 实际=${maxDiffEntry.healthyPercentage}% vs 期望=${maxDiffEntry.expectedH}%`);
        console.log(`     · Warning: 实际=${maxDiffEntry.warningPercentage}% vs 期望=${maxDiffEntry.expectedW}%`);
        console.log(`     · Concerning: 实际=${maxDiffEntry.concerningPercentage}% vs 期望=${maxDiffEntry.expectedC}%`);
        console.log(`     · 差异分: ${maxDiffEntry.diffScore}`);
      }
    }

    const os = d.overallStatistics;
    if (typeof os !== 'object' || os === null) { console.log('❌ overallStatistics 缺失或类型错误'); return false; }
    ['totalRecords','averageHealthyPercentage','averageWarningPercentage','averageConcerningPercentage','totalAnomalies','highSeverityAnomalies'].forEach(k => {
      if (typeof os[k] !== 'number') { console.log(`❌ overallStatistics.${k} 类型应为 number`); ok = false; }
    });
    ['averageHealthyPercentage','averageWarningPercentage','averageConcerningPercentage'].forEach(k => {
      if (os[k] < 0 || os[k] > 100) { console.log(`❌ overallStatistics.${k} 范围应在 [0,100]`); ok = false; }
    });
    if (!Number.isInteger(os.totalRecords) || os.totalRecords < 0) { console.log('❌ overallStatistics.totalRecords 应为非负整数'); ok = false; }
    if (!Number.isInteger(os.totalAnomalies) || os.totalAnomalies < 0) { console.log('❌ overallStatistics.totalAnomalies 应为非负整数'); ok = false; }
    if (!Number.isInteger(os.highSeverityAnomalies) || os.highSeverityAnomalies < 0) { console.log('❌ overallStatistics.highSeverityAnomalies 应为非负整数'); ok = false; }
    if (os.highSeverityAnomalies > os.totalAnomalies) { console.log('⚠️ overallStatistics.highSeverityAnomalies 不应超过 totalAnomalies'); }

    // 一致性校验：聚合与平均
    const validStats = (Array.isArray(d.petSummaries) ? d.petSummaries : []).filter(s => s.statistics && typeof s.statistics === 'object');
    const sumTotalRecords = validStats.reduce((acc, s) => acc + (s.statistics.totalRecords || 0), 0);
    if (os.totalRecords !== sumTotalRecords) { console.log(`❌ overallStatistics.totalRecords(${os.totalRecords}) != 汇总总记录(${sumTotalRecords})`); ok = false; }
    const sumAnomalies = (Array.isArray(d.petSummaries) ? d.petSummaries : []).reduce((acc, s) => acc + (s.anomaliesCount || 0), 0);
    if (os.totalAnomalies !== sumAnomalies) { console.log(`❌ overallStatistics.totalAnomalies(${os.totalAnomalies}) != 异常数汇总(${sumAnomalies})`); ok = false; }
    const sumHighSeverity = (Array.isArray(d.petSummaries) ? d.petSummaries : []).reduce((acc, s) => acc + (s.highSeverityAnomalies || 0), 0);
    if (os.highSeverityAnomalies !== sumHighSeverity) { console.log(`❌ overallStatistics.highSeverityAnomalies(${os.highSeverityAnomalies}) != 高严重度汇总(${sumHighSeverity})`); ok = false; }
    if (validStats.length > 0) {
      const avgH = Math.round(validStats.reduce((sum, s) => sum + (s.statistics.healthyPercentage || 0), 0) / validStats.length);
      const avgW = Math.round(validStats.reduce((sum, s) => sum + (s.statistics.warningPercentage || 0), 0) / validStats.length);
      const avgC = Math.round(validStats.reduce((sum, s) => sum + (s.statistics.concerningPercentage || 0), 0) / validStats.length);
      if (os.averageHealthyPercentage !== avgH) { console.log(`❌ overallStatistics.averageHealthyPercentage(${os.averageHealthyPercentage}) != 期望(${avgH})`); ok = false; }
      if (os.averageWarningPercentage !== avgW) { console.log(`❌ overallStatistics.averageWarningPercentage(${os.averageWarningPercentage}) != 期望(${avgW})`); ok = false; }
      if (os.averageConcerningPercentage !== avgC) { console.log(`❌ overallStatistics.averageConcerningPercentage(${os.averageConcerningPercentage}) != 期望(${avgC})`); ok = false; }

      // 加权平均（按总记录权重）与总体计数比值对照
      const sumHealthyCounts = validStats.reduce((acc, s) => acc + (s.statistics.healthyCount || 0), 0);
      const sumWarningCounts = validStats.reduce((acc, s) => acc + (s.statistics.warningCount || 0), 0);
      const sumConcerningCounts = validStats.reduce((acc, s) => acc + (s.statistics.concerningCount || 0), 0);

      const weightedH = sumTotalRecords ? Math.round((sumHealthyCounts / sumTotalRecords) * 100) : 0;
      const weightedW = sumTotalRecords ? Math.round((sumWarningCounts / sumTotalRecords) * 100) : 0;
      const weightedC = sumTotalRecords ? Math.round((sumConcerningCounts / sumTotalRecords) * 100) : 0;

      const diffWeightedH = Math.abs(os.averageHealthyPercentage - weightedH);
      const diffWeightedW = Math.abs(os.averageWarningPercentage - weightedW);
      const diffWeightedC = Math.abs(os.averageConcerningPercentage - weightedC);

      console.log(`   - 对照（简单平均 vs 加权平均）: H=${avgH}%/${weightedH}%, W=${avgW}%/${weightedW}%, C=${avgC}%/${weightedC}%`);
      // 差异超过阈值，给出提醒但不判失败
      if (diffWeightedH > AVG_DIFF_THRESHOLD_PT) console.log(`⚠️ averageHealthyPercentage 与加权平均差异 ${diffWeightedH}pt`);
      if (diffWeightedW > AVG_DIFF_THRESHOLD_PT) console.log(`⚠️ averageWarningPercentage 与加权平均差异 ${diffWeightedW}pt`);
      if (diffWeightedC > AVG_DIFF_THRESHOLD_PT) console.log(`⚠️ averageConcerningPercentage 与加权平均差异 ${diffWeightedC}pt`);
    }

    return ok;
  } catch (error) {
    console.log('❌ 多宠物汇总请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUserOverview() {
  try {
    console.log('\n👤 测试用户概览...');
    const resp = await axios.get(`${API_BASE}/statistics/overview/user`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (!resp.data?.success) {
      console.log('❌ 获取用户概览失败:', resp.data?.message);
      return false;
    }

    const d = resp.data.data;
    console.log('✅ 用户概览获取成功');
    console.log(`   - 总宠物: ${d.totalPets}, 活跃宠物: ${d.activePets}`);

    let ok = true;
    if (typeof d.totalPets !== 'number' || d.totalPets < 0) { console.log('❌ totalPets 应为非负数'); ok = false; }
    if (typeof d.activePets !== 'number' || d.activePets < 0) { console.log('❌ activePets 应为非负数'); ok = false; }
    if (d.activePets > d.totalPets) { console.log('⚠️ activePets 不应超过 totalPets'); }

    // periodStatistics 校验
    const ps = d.periodStatistics;
    if (typeof ps !== 'object' || ps === null) { console.log('❌ periodStatistics 缺失或类型错误'); return false; }
    ['week','month','quarter'].forEach(key => {
      const st = ps[key];
      if (!st || typeof st !== 'object') { console.log(`❌ periodStatistics.${key} 缺失或类型错误`); ok = false; return; }
      ['period','totalRecords','healthyCount','warningCount','concerningCount','healthyPercentage','warningPercentage','concerningPercentage','averageConfidence','frequencyPerWeek','activePets'].forEach(k => {
        if (!(k in st)) { console.log(`❌ periodStatistics.${key} 缺少字段 ${k}`); ok = false; }
      });
      if (st.period !== key) { console.log(`⚠️ periodStatistics.${key}.period 与键不一致: ${st.period}`); }
      ['totalRecords','healthyCount','warningCount','concerningCount','activePets'].forEach(k => {
        if (typeof st[k] !== 'number' || !Number.isInteger(st[k]) || st[k] < 0) { console.log(`❌ periodStatistics.${key}.${k} 应为非负整数`); ok = false; }
      });
      ['healthyPercentage','warningPercentage','concerningPercentage'].forEach(k => {
        if (typeof st[k] !== 'number' || st[k] < 0 || st[k] > 100) { console.log(`❌ periodStatistics.${key}.${k} 范围应在 [0,100]`); ok = false; }
      });
      if (typeof st.averageConfidence !== 'number' || st.averageConfidence < 0 || st.averageConfidence > 100) { console.log(`❌ periodStatistics.${key}.averageConfidence 范围应在 [0,100]`); ok = false; }
      if (typeof st.frequencyPerWeek !== 'number' || st.frequencyPerWeek < 0) { console.log(`❌ periodStatistics.${key}.frequencyPerWeek 应为非负数`); ok = false; }

      const sumCounts = st.healthyCount + st.warningCount + st.concerningCount;
      if (st.totalRecords !== sumCounts) { console.log(`❌ periodStatistics.${key}.totalRecords(${st.totalRecords}) ≠ 计数和(${sumCounts})`); ok = false; }

      if (st.totalRecords === 0) {
        if (st.healthyPercentage !== 0 || st.warningPercentage !== 0 || st.concerningPercentage !== 0) {
          console.log(`❌ periodStatistics.${key} totalRecords=0 时百分比应为 0`); ok = false;
        }
      } else {
        const expectedH = Math.round((st.healthyCount / st.totalRecords) * 100);
        const expectedW = Math.round((st.warningCount / st.totalRecords) * 100);
        const expectedC = Math.round((st.concerningCount / st.totalRecords) * 100);
        if (st.healthyPercentage !== expectedH) console.log(`⚠️ periodStatistics.${key}.healthyPercentage(${st.healthyPercentage}) != 期望(${expectedH})`);
        if (st.warningPercentage !== expectedW) console.log(`⚠️ periodStatistics.${key}.warningPercentage(${st.warningPercentage}) != 期望(${expectedW})`);
        if (st.concerningPercentage !== expectedC) console.log(`⚠️ periodStatistics.${key}.concerningPercentage(${st.concerningPercentage}) != 期望(${expectedC})`);
        const sumPct = st.healthyPercentage + st.warningPercentage + st.concerningPercentage;
        if (sumPct < 98 || sumPct > 102) console.log(`⚠️ periodStatistics.${key} 百分比和(${sumPct}) 不在 98-102 范围`);
      }
    });

    // summary 校验
    const sm = d.summary;
    if (typeof sm !== 'object' || sm === null) { console.log('❌ summary 缺失或类型错误'); ok = false; }
    else {
      ['totalRecordsThisMonth','healthyRateThisMonth','activeAnomalies','averageFrequencyPerWeek'].forEach(k => {
        if (!(k in sm)) { console.log(`❌ summary 缺少字段 ${k}`); ok = false; }
      });
      if (!Number.isInteger(sm.totalRecordsThisMonth) || sm.totalRecordsThisMonth < 0) { console.log('❌ summary.totalRecordsThisMonth 应为非负整数'); ok = false; }
      if (typeof sm.healthyRateThisMonth !== 'number' || sm.healthyRateThisMonth < 0 || sm.healthyRateThisMonth > 100) { console.log('❌ summary.healthyRateThisMonth 范围应在 [0,100]'); ok = false; }
      if (!Number.isInteger(sm.activeAnomalies) || sm.activeAnomalies < 0) { console.log('❌ summary.activeAnomalies 应为非负整数'); ok = false; }
      if (typeof sm.averageFrequencyPerWeek !== 'number' || sm.averageFrequencyPerWeek < 0) { console.log('❌ summary.averageFrequencyPerWeek 应为非负数'); ok = false; }
    }

    // recentAnomalies 基本校验
    if (!Array.isArray(d.recentAnomalies)) { console.log('❌ recentAnomalies 不是数组'); ok = false; }
    else {
      d.recentAnomalies.forEach((a, idx) => {
        if (!a.petId) console.log(`⚠️ 第${idx+1}个异常缺少 petId`);
        if (typeof a.petName !== 'string') console.log(`⚠️ 第${idx+1}个异常 petName 类型应为 string`);
        if (typeof a.severity !== 'string') console.log(`⚠️ 第${idx+1}个异常 severity 类型应为 string`);
        if (typeof a.confidence !== 'number' || a.confidence < 0 || a.confidence > 100) console.log(`⚠️ 第${idx+1}个异常 confidence 范围应在 [0,100]`);
        if (a.detectedAt) {
          const dt = new Date(a.detectedAt);
          if (isNaN(dt.getTime())) console.log(`⚠️ 第${idx+1}个异常 detectedAt 非有效日期`);
        }
      });
    }

    return ok;
  } catch (error) {
    console.log('❌ 用户概览请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}