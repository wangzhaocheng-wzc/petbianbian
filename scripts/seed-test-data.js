const axios = require('axios');
const FormData = require('form-data');
const { MongoClient } = require('mongodb');
const fs = require('fs');

async function main() {
  const API_BASE = process.env.SEED_API_URL || 'http://localhost:5000/api';
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health';

  console.log(`使用后端API: ${API_BASE}`);
  console.log(`MongoDB连接: ${MONGO_URI}`);

  // 创建基础账户
  const users = [
    { username: 'admin1', email: 'admin1@example.com', password: 'Admin@123', confirmPassword: 'Admin@123' },
    { username: 'mod1', email: 'mod1@example.com', password: 'Mod@123', confirmPassword: 'Mod@123' },
    { username: 'tester1', email: 'tester1@example.com', password: 'Tester@123', confirmPassword: 'Tester@123' },
  ];

  const tokens = {};
  for (const u of users) {
    try {
      const reg = await axios.post(`${API_BASE}/auth/register`, u);
      tokens[u.username] = reg.data.data.tokens.access_token;
      console.log(`注册成功: ${u.username}`);
    } catch (e) {
      // 已存在则登录
      try {
        const login = await axios.post(`${API_BASE}/auth/login`, { email: u.email, password: u.password });
        tokens[u.username] = login.data.data.tokens.access_token;
        console.log(`登录成功: ${u.username}`);
      } catch (err) {
        console.error(`账户处理失败: ${u.username}`, err?.response?.data || err.message);
        throw err;
      }
    }
  }

  // 提升角色：admin1 -> admin, mod1 -> moderator（仅在主库为Mongo时直接更新）
  const DB_PRIMARY = process.env.DB_PRIMARY || 'mongo';
  if (DB_PRIMARY === 'mongo') {
    try {
      const mongo = new MongoClient(MONGO_URI);
      await mongo.connect();
      const db = mongo.db();
      await db.collection('users').updateOne({ username: 'admin1' }, { $set: { role: 'admin', isVerified: true } });
      await db.collection('users').updateOne({ username: 'mod1' }, { $set: { role: 'moderator', isVerified: true } });
      console.log('角色更新完成: admin1=admin, mod1=moderator');
      await mongo.close();
    } catch (err) {
      console.warn('Mongo不可用或连接失败，跳过角色直接更新：', err?.message || err);
    }
  } else {
    console.log('主库为 Postgres，跳过Mongo角色直接更新');
  }

  // 使用tester1创建宠物
  const testerToken = tokens['tester1'];
  const authHeader = { headers: { Authorization: `Bearer ${testerToken}` } };
  const pets = [
    { name: '小黑', type: 'dog', breed: '拉布拉多', gender: 'male', age: 3, weight: 20.5, description: '活泼好动' },
    { name: '喵喵', type: 'cat', breed: '英短', gender: 'female', age: 2, weight: 4.2, description: '安静黏人' },
  ];

  const createdPets = [];
  for (const p of pets) {
    try {
      const resp = await axios.post(`${API_BASE}/pets`, p, authHeader);
      createdPets.push(resp.data.data);
      console.log(`创建宠物成功: ${resp.data.data.name}`);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (typeof msg === 'string' && (msg.includes('同名') || msg.includes('已存在'))) {
        const retryPet = { ...p, name: `${p.name}-${Math.floor(Date.now()/1000)}` };
        const retry = await axios.post(`${API_BASE}/pets`, retryPet, authHeader);
        createdPets.push(retry.data.data);
        console.log(`创建宠物成功(重试重命名): ${retry.data.data.name}`);
      } else {
        console.error('创建宠物失败:', err?.response?.data || err.message);
        throw err;
      }
    }
  }

  // 为第一个宠物上传分析记录（生成模拟图片缓冲）
  async function uploadAnalysis(petId, notes) {
    const form = new FormData();
    const buf = Buffer.from('mock-image-data');
    form.append('image', buf, { filename: 'sample.jpg', contentType: 'image/jpeg' });
    form.append('petId', petId);

    const headers = { ...form.getHeaders(), Authorization: `Bearer ${testerToken}` };
    const resp = await axios.post(`${API_BASE}/analysis/upload`, form, { headers });

    // 追加备注或症状
    if (notes) {
      const recId = resp.data.data._id || resp.data.data.id;
      await axios.put(`${API_BASE}/analysis/record/${recId}`, { userNotes: notes, symptoms: ['腹泻', '食欲下降'] }, authHeader);
    }
    console.log('上传分析记录成功');
  }

  for (let i = 0; i < 3; i++) {
    await uploadAnalysis(createdPets[0]._id || createdPets[0].id, `第${i + 1}次测试记录`);
  }

  // 发表社区帖子与评论
  const post = await axios.post(`${API_BASE}/community/posts`, {
    title: '拉布拉多近期便便形状偏软，是否正常？',
    content: '最近几天便便呈type5，精神状态良好，饮食正常。请教是否需要就医？',
    petId: createdPets[0]._id || createdPets[0].id,
    tags: ['健康', '饮食'],
    category: 'health'
  }, authHeader);
  console.log('创建帖子成功');

  await axios.post(`${API_BASE}/community/posts/${post.data.data._id || post.data.data.id}/comments`, {
    content: '建议观察两三天，保持清淡饮食，如果持续偏软考虑就医。'
  }, authHeader);
  console.log('发表评论成功');

  console.log('测试数据种子完成');
}

main().catch(err => {
  console.error('数据种子失败:', err?.response?.data || err);
  process.exit(1);
});