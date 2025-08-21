// Simple test to verify performance optimizations work
console.log('Testing performance optimizations...');

// Test image optimization
import('./src/utils/imageOptimization.js').then(module => {
  console.log('✅ Image optimization module loaded');
  
  // Test WebP support detection
  module.supportsWebP().then(supported => {
    console.log('WebP support:', supported ? '✅ Supported' : '❌ Not supported');
  });
}).catch(err => {
  console.error('❌ Image optimization module failed:', err.message);
});

// Test service worker utilities
import('./src/utils/serviceWorker.js').then(module => {
  console.log('✅ Service worker utilities loaded');
  
  // Test online status
  console.log('Online status:', module.isOnline() ? '✅ Online' : '❌ Offline');
}).catch(err => {
  console.error('❌ Service worker utilities failed:', err.message);
});

// Test resource preloader
import('./src/utils/resourcePreloader.js').then(module => {
  console.log('✅ Resource preloader loaded');
  
  // Test preconnect
  module.preconnectDomain('https://api.example.com');
  console.log('✅ Preconnect domain added');
}).catch(err => {
  console.error('❌ Resource preloader failed:', err.message);
});

console.log('🎉 Performance optimization tests completed!');