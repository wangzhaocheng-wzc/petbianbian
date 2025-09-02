#!/usr/bin/env node

/**
 * Test Data Automation Script
 * Handles automated test data initialization and cleanup
 */

const { MongoClient } = require('mongodb');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

class TestDataAutomation {
  constructor(options = {}) {
    this.mongoUri = options.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health-test';
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.verbose = options.verbose || false;
    
    this.mongoClient = null;
    this.redisClient = null;
  }

  log(message, level = 'info') {
    if (!this.verbose && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async connect() {
    try {
      // Connect to MongoDB
      this.mongoClient = new MongoClient(this.mongoUri);
      await this.mongoClient.connect();
      this.log('Connected to MongoDB', 'success');

      // Connect to Redis
      this.redisClient = redis.createClient({ url: this.redisUrl });
      await this.redisClient.connect();
      this.log('Connected to Redis', 'success');
    } catch (error) {
      this.log(`Connection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.mongoClient) {
        await this.mongoClient.close();
        this.log('Disconnected from MongoDB');
      }
      
      if (this.redisClient) {
        await this.redisClient.quit();
        this.log('Disconnected from Redis');
      }
    } catch (error) {
      this.log(`Disconnect error: ${error.message}`, 'warning');
    }
  }

  async initializeTestData() {
    this.log('Initializing test data...');
    
    try {
      await this.connect();
      
      const db = this.mongoClient.db();
      
      // Clear existing test data
      await this.clearTestData();
      
      // Create test users
      const users = await this.createTestUsers(db);
      this.log(`Created ${users.length} test users`, 'debug');
      
      // Create test pets
      const pets = await this.createTestPets(db, users);
      this.log(`Created ${pets.length} test pets`, 'debug');
      
      // Create test analysis records
      const records = await this.createTestAnalysisRecords(db, pets);
      this.log(`Created ${records.length} test analysis records`, 'debug');
      
      // Create test community posts
      const posts = await this.createTestCommunityPosts(db, users);
      this.log(`Created ${posts.length} test community posts`, 'debug');
      
      // Initialize Redis cache
      await this.initializeRedisCache();
      
      this.log('Test data initialization completed', 'success');
      
      return {
        users: users.length,
        pets: pets.length,
        records: records.length,
        posts: posts.length
      };
    } catch (error) {
      this.log(`Test data initialization failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async clearTestData() {
    this.log('Clearing existing test data...');
    
    const db = this.mongoClient.db();
    
    // Clear MongoDB collections
    const collections = ['users', 'pets', 'analysisrecords', 'communityposts', 'comments'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        this.log(`Cleared ${result.deletedCount} documents from ${collectionName}`, 'debug');
      } catch (error) {
        this.log(`Failed to clear ${collectionName}: ${error.message}`, 'warning');
      }
    }
    
    // Clear Redis cache
    try {
      await this.redisClient.flushDb();
      this.log('Cleared Redis cache', 'debug');
    } catch (error) {
      this.log(`Failed to clear Redis: ${error.message}`, 'warning');
    }
  }

  async createTestUsers(db) {
    const users = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        password: '$2b$10$rQZ9QmjlZKZK5Z5Z5Z5Z5u', // hashed 'password123'
        isVerified: true,
        createdAt: new Date(),
        profile: {
          firstName: 'Test',
          lastName: 'User One',
          avatar: null
        }
      },
      {
        username: 'testuser2',
        email: 'test2@example.com',
        password: '$2b$10$rQZ9QmjlZKZK5Z5Z5Z5Z5u',
        isVerified: true,
        createdAt: new Date(),
        profile: {
          firstName: 'Test',
          lastName: 'User Two',
          avatar: null
        }
      },
      {
        username: 'testadmin',
        email: 'admin@example.com',
        password: '$2b$10$rQZ9QmjlZKZK5Z5Z5Z5Z5u',
        isVerified: true,
        role: 'admin',
        createdAt: new Date(),
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          avatar: null
        }
      }
    ];

    const result = await db.collection('users').insertMany(users);
    return users.map((user, index) => ({
      ...user,
      _id: result.insertedIds[index]
    }));
  }

  async createTestPets(db, users) {
    const pets = [];
    
    for (const user of users) {
      const userPets = [
        {
          name: `${user.username}_dog`,
          type: 'dog',
          breed: 'Golden Retriever',
          age: 3,
          weight: 25.5,
          gender: 'male',
          ownerId: user._id,
          createdAt: new Date(),
          avatar: null,
          healthInfo: {
            vaccinations: ['rabies', 'distemper'],
            allergies: [],
            medications: []
          }
        },
        {
          name: `${user.username}_cat`,
          type: 'cat',
          breed: 'Persian',
          age: 2,
          weight: 4.2,
          gender: 'female',
          ownerId: user._id,
          createdAt: new Date(),
          avatar: null,
          healthInfo: {
            vaccinations: ['feline_distemper'],
            allergies: ['fish'],
            medications: []
          }
        }
      ];
      
      pets.push(...userPets);
    }

    const result = await db.collection('pets').insertMany(pets);
    return pets.map((pet, index) => ({
      ...pet,
      _id: result.insertedIds[index]
    }));
  }

  async createTestAnalysisRecords(db, pets) {
    const records = [];
    
    for (const pet of pets) {
      const petRecords = [
        {
          petId: pet._id,
          imageUrl: '/uploads/test-images/sample-poop-1.jpg',
          analysisResult: {
            healthStatus: 'healthy',
            confidence: 0.95,
            shape: 'normal',
            color: 'brown',
            consistency: 'firm',
            recommendations: ['Continue current diet', 'Regular exercise']
          },
          notes: 'Regular checkup analysis',
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          isPublic: false
        },
        {
          petId: pet._id,
          imageUrl: '/uploads/test-images/sample-poop-2.jpg',
          analysisResult: {
            healthStatus: 'warning',
            confidence: 0.78,
            shape: 'loose',
            color: 'light_brown',
            consistency: 'soft',
            recommendations: ['Monitor diet', 'Increase fiber intake', 'Consult vet if persists']
          },
          notes: 'Slight digestive concern',
          createdAt: new Date(Date.now() - 43200000), // 12 hours ago
          isPublic: false
        }
      ];
      
      records.push(...petRecords);
    }

    const result = await db.collection('analysisrecords').insertMany(records);
    return records.map((record, index) => ({
      ...record,
      _id: result.insertedIds[index]
    }));
  }

  async createTestCommunityPosts(db, users) {
    const posts = [
      {
        authorId: users[0]._id,
        title: 'Tips for healthy pet diet',
        content: 'Here are some great tips for maintaining a healthy diet for your pets...',
        images: ['/uploads/test-images/diet-tips.jpg'],
        tags: ['diet', 'health', 'tips'],
        likes: 15,
        comments: 3,
        isPublic: true,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000)
      },
      {
        authorId: users[1]._id,
        title: 'My pet\'s health journey',
        content: 'Sharing my experience with monitoring my pet\'s health using this platform...',
        images: [],
        tags: ['experience', 'health', 'monitoring'],
        likes: 8,
        comments: 1,
        isPublic: true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000)
      }
    ];

    const result = await db.collection('communityposts').insertMany(posts);
    return posts.map((post, index) => ({
      ...post,
      _id: result.insertedIds[index]
    }));
  }

  async initializeRedisCache() {
    this.log('Initializing Redis cache...', 'debug');
    
    // Set some test cache entries
    const cacheEntries = [
      { key: 'test:health_check', value: 'ok', ttl: 3600 },
      { key: 'test:api_status', value: 'active', ttl: 1800 },
      { key: 'test:feature_flags', value: JSON.stringify({ analysis: true, community: true }), ttl: 7200 }
    ];

    for (const entry of cacheEntries) {
      try {
        await this.redisClient.setEx(entry.key, entry.ttl, entry.value);
        this.log(`Set cache entry: ${entry.key}`, 'debug');
      } catch (error) {
        this.log(`Failed to set cache entry ${entry.key}: ${error.message}`, 'warning');
      }
    }
  }

  async validateTestData() {
    this.log('Validating test data...');
    
    try {
      await this.connect();
      
      const db = this.mongoClient.db();
      const validation = {
        users: await db.collection('users').countDocuments(),
        pets: await db.collection('pets').countDocuments(),
        records: await db.collection('analysisrecords').countDocuments(),
        posts: await db.collection('communityposts').countDocuments()
      };

      this.log(`Validation results: ${JSON.stringify(validation)}`, 'debug');
      
      const isValid = validation.users > 0 && validation.pets > 0;
      
      if (isValid) {
        this.log('Test data validation passed', 'success');
      } else {
        this.log('Test data validation failed', 'error');
      }
      
      return { valid: isValid, counts: validation };
    } catch (error) {
      this.log(`Test data validation error: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async createTestImages() {
    this.log('Creating test images...');
    
    const testImagesDir = path.join(__dirname, '../fixtures/test-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(testImagesDir)) {
      fs.mkdirSync(testImagesDir, { recursive: true });
    }

    // Create placeholder test images (1x1 pixel PNGs)
    const testImages = [
      'sample-poop-1.jpg',
      'sample-poop-2.jpg',
      'diet-tips.jpg',
      'test-pet-avatar.jpg'
    ];

    // Simple 1x1 pixel PNG data (base64)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==',
      'base64'
    );

    for (const imageName of testImages) {
      const imagePath = path.join(testImagesDir, imageName);
      if (!fs.existsSync(imagePath)) {
        fs.writeFileSync(imagePath, pngData);
        this.log(`Created test image: ${imageName}`, 'debug');
      }
    }

    this.log('Test images created', 'success');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';
  
  const options = {
    mongoUri: process.env.MONGODB_URI,
    redisUrl: process.env.REDIS_URL,
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  const automation = new TestDataAutomation(options);

  try {
    switch (command) {
      case 'init':
        await automation.createTestImages();
        const result = await automation.initializeTestData();
        console.log('✅ Test data initialized:', result);
        break;
      case 'clear':
        await automation.connect();
        await automation.clearTestData();
        await automation.disconnect();
        console.log('✅ Test data cleared');
        break;
      case 'validate':
        const validation = await automation.validateTestData();
        console.log('✅ Validation completed:', validation);
        break;
      case 'images':
        await automation.createTestImages();
        console.log('✅ Test images created');
        break;
      default:
        console.log('Usage: node test-data-automation.js [init|clear|validate|images] [--verbose]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TestDataAutomation };