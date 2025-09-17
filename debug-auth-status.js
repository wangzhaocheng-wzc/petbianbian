// 调试认证状态脚本
console.log('=== 认证状态调试 ===');

// 1. 检查localStorage
console.log('1. localStorage状态:');
const accessToken = localStorage.getItem('accessToken');
const refreshToken = localStorage.getItem('refreshToken');
console.log('accessToken存在:', !!accessToken);
console.log('refreshToken存在:', !!refreshToken);

if (accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Token过期时间:', new Date(payload.exp * 1000));
    console.log('Token是否过期:', Date.now() > payload.exp * 1000);
  } catch (e) {
    console.log('Token解析失败:', e);
  }
}

// 2. 检查React组件状态
console.log('\n2. React组件状态:');
const reactRoot = document.querySelector('#root');
if (reactRoot && reactRoot._reactInternalFiber) {
  console.log('React根组件存在');
} else {
  console.log('React根组件不存在或结构已变化');
}

// 3. 检查当前URL和路由状态
console.log('\n3. 路由状态:');
console.log('当前URL:', window.location.href);
console.log('pathname:', window.location.pathname);
console.log('search:', window.location.search);
console.log('hash:', window.location.hash);

// 4. 检查网络请求
console.log('\n4. 发送认证请求测试:');
fetch('/api/auth/me', {
  headers: {
    'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('认证请求状态:', response.status);
  return response.json();
})
.then(data => {
  console.log('认证请求响应:', data);
})
.catch(error => {
  console.log('认证请求失败:', error);
});

// 5. 检查页面上的React组件状态
console.log('\n5. 页面元素检查:');
const loadingElement = document.querySelector('.animate-spin');
console.log('是否显示加载动画:', !!loadingElement);

const navigationElements = document.querySelectorAll('nav a, [role="navigation"] a');
console.log('导航链接数量:', navigationElements.length);
navigationElements.forEach((link, index) => {
  console.log(`导航链接${index + 1}:`, link.textContent, '->', link.href);
});

// 6. 监听点击事件
console.log('\n6. 设置点击监听:');
document.addEventListener('click', function(e) {
  if (e.target.tagName === 'A' || e.target.closest('a')) {
    const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
    console.log('点击链接:', link.textContent, '->', link.href);
    console.log('当前认证状态 - accessToken存在:', !!localStorage.getItem('accessToken'));
  }
});

console.log('调试脚本设置完成，请点击导航链接查看日志');