import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'e2e', 'fixtures', 'images', 'test-poop-1.jpg');

async function runTests() {
  try {
    console.log('开始运行测试...');

    // 1. 登录测试
    console.log('\n1. 测试登录...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'e2e@test.com',
      password: 'TestPassword123!'
    });

    if (!loginResponse.data.data.tokens.access_token) {
      throw new Error('登录失败：没有收到访问令牌');
    }
    console.log('✓ 登录成功');

    const accessToken = loginResponse.data.data.tokens.access_token;

    // 2. 图片上传测试
    console.log('\n2. 测试图片上传...');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('petId', '65248f842d0d8f9d12345678'); // 添加一个测试用的宠物ID

    const uploadResponse = await axios.post(
      `${API_URL}/analysis/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!uploadResponse.data.success || !uploadResponse.data.data) {
      throw new Error('图片上传失败：没有收到分析记录');
    }
    console.log('✓ 图片上传成功');
    console.log('分析记录:', uploadResponse.data.data);

    console.log('\n所有测试通过！');
  } catch (error) {
    console.error('\n测试失败:', error.message);
    if (error.response) {
      console.error('错误详情:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('请求错误:', error.request);
    } else {
      console.error('错误:', error);
    }
    process.exit(1);
  }
}

runTests();