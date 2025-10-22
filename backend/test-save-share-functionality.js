const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSaveAndShare() {
  console.log('🧪 测试便便分析保存和分享功能...\n');
  
  const API_BASE = 'http://localhost:5000/api';
  let token = '';
  let userId = '';
  let petId = '';
  let recordId = '';
  
  try {
    // 1. 用户注册和登录
    console.log('1. 注册测试用户...');
    const registerData = {
      username: 'testuser' + Date.now().toString().slice(-8),
      email: 'test_' + Date.now() + '@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      profile: {
        firstName: '测试',
        lastName: '用户'
      }
    };
    
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    if (!registerResponse.data.success) {
      throw new Error('注册失败: ' + registerResponse.data.message);
    }
    
    token = registerResponse.data.data.tokens.access_token;
    userId = registerResponse.data.data.user.id;
    console.log('✓ 用户注册成功，ID:', userId);
    
    // 2. 创建宠物
    console.log('\n2. 创建测试宠物...');
    const petData = {
      name: '测试宠物_' + Date.now(),
      type: 'dog',
      breed: '金毛',
      age: 2,
      weight: 25.5,
      gender: 'male'
    };
    
    const petResponse = await axios.post(`${API_BASE}/pets`, petData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!petResponse.data.success) {
      throw new Error('创建宠物失败: ' + petResponse.data.message);
    }
    
    petId = petResponse.data.data.id;
    console.log('✓ 宠物创建成功，ID:', petId);
    
    // 3. 准备测试图片文件
    console.log('\n3. 准备测试图片...');
    const testImagePath = path.join(__dirname, 'test-poop-image.jpg');
    
    // 如果测试图片不存在，创建一个
    if (!fs.existsSync(testImagePath)) {
      console.log('测试图片不存在，正在创建...');
      const sharp = require('sharp');
      
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 139, g: 69, b: 19 } // 棕色背景
        }
      })
      .jpeg({ quality: 80 })
      .toFile(testImagePath);
      
      console.log('✓ 测试图片已创建');
    }
    
    const stats = fs.statSync(testImagePath);
    console.log('✓ 测试图片已准备好');
    console.log('  - 文件大小:', stats.size, 'bytes');
    
    // 4. 上传图片进行分析
    console.log('\n4. 上传图片进行分析...');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('petId', petId);
    formData.append('notes', '测试分析记录');
    formData.append('symptoms', '正常');
    
    const analysisResponse = await axios.post(`${API_BASE}/analysis/upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    if (!analysisResponse.data.success) {
      throw new Error('分析失败: ' + analysisResponse.data.message);
    }
    
    recordId = analysisResponse.data.data.id;
    console.log('✓ 分析完成，记录ID:', recordId);
    console.log('  - 健康状态:', analysisResponse.data.data.analysis.healthStatus);
    console.log('  - 置信度:', analysisResponse.data.data.analysis.confidence);
    
    // 5. 测试保存功能（更新记录）
    console.log('\n5. 测试保存功能...');
    const updateData = {
      userNotes: '更新的用户备注',
      symptoms: ['正常', '颜色正常'],
      isShared: false
    };
    
    const updateResponse = await axios.put(`${API_BASE}/analysis/record/${recordId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!updateResponse.data.success) {
      throw new Error('保存记录失败: ' + updateResponse.data.message);
    }
    
    console.log('✓ 记录保存成功');
    console.log('  - 用户备注:', updateResponse.data.data.userNotes);
    console.log('  - 症状:', updateResponse.data.data.symptoms);
    
    // 6. 测试分享到社区功能
    console.log('\n6. 测试分享到社区功能...');
    const shareResponse = await axios.post(`${API_BASE}/analysis/record/${recordId}/share`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!shareResponse.data.success) {
      throw new Error('分享到社区失败: ' + shareResponse.data.message);
    }
    
    console.log('✓ 分享到社区成功');
    console.log('  - 社区帖子ID:', shareResponse.data.data.communityPost._id);
    console.log('  - 帖子标题:', shareResponse.data.data.communityPost.title);
    
    // 7. 验证记录状态
    console.log('\n7. 验证记录状态...');
    const getRecordResponse = await axios.get(`${API_BASE}/analysis/record/${recordId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!getRecordResponse.data.success) {
      throw new Error('获取记录失败: ' + getRecordResponse.data.message);
    }
    
    const record = getRecordResponse.data.data;
    console.log('✓ 记录状态验证完成');
    console.log('  - 是否已分享:', record.isShared);
    console.log('  - 创建时间:', record.createdAt);
    console.log('  - 更新时间:', record.updatedAt);
    
    // 清理测试文件
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    console.log('\n🎉 所有测试通过！保存和分享功能正常工作。');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    
    // 清理测试文件
    const testImagePath = path.join(__dirname, 'test-poop-image.jpg');
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    process.exit(1);
  }
}

testSaveAndShare();