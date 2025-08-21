const { createClient } = require('redis');

async function testRedisConnection() {
  console.log('Testing Redis connection and caching functionality...');
  
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  try {
    // Connect to Redis
    await client.connect();
    console.log('✅ Redis connection successful');

    // Test basic operations
    await client.set('test:key', 'test value', { EX: 60 });
    console.log('✅ Set operation successful');

    const value = await client.get('test:key');
    console.log('✅ Get operation successful:', value);

    const exists = await client.exists('test:key');
    console.log('✅ Exists operation successful:', exists === 1);

    // Test expiration
    await client.expire('test:key', 30);
    console.log('✅ Expire operation successful');

    // Test deletion
    await client.del('test:key');
    console.log('✅ Delete operation successful');

    // Test pattern operations
    await client.set('user:123:profile', JSON.stringify({ name: 'Test User' }));
    await client.set('user:123:pets', JSON.stringify([{ name: 'Fluffy' }]));
    await client.set('user:456:profile', JSON.stringify({ name: 'Another User' }));

    const keys = await client.keys('user:123:*');
    console.log('✅ Pattern search successful:', keys);

    // Cleanup
    await client.del(keys);
    await client.del('user:456:profile');
    console.log('✅ Cleanup successful');

    console.log('\n🎉 All Redis cache tests passed!');

  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    process.exit(1);
  } finally {
    await client.disconnect();
    console.log('✅ Redis connection closed');
  }
}

// Run the test
testRedisConnection();