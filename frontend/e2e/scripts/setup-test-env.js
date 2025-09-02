#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * Handles test environment deployment and configuration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestEnvironmentManager {
  constructor(options = {}) {
    this.environment = options.environment || process.env.TEST_ENV || 'ci';
    this.verbose = options.verbose || false;
    this.timeout = options.timeout || 300000; // 5 minutes
    this.retries = options.retries || 3;
    
    this.config = {
      ci: {
        mongoUri: 'mongodb://localhost:27017/pet-health-test-ci',
        redisUrl: 'redis://localhost:6379',
        backendPort: 5000,
        frontendPort: 3000,
        apiUrl: 'http://localhost:5000/api'
      },
      local: {
        mongoUri: 'mongodb://localhost:27017/pet-health-test-local',
        redisUrl: 'redis://localhost:6379',
        backendPort: 5001,
        frontendPort: 3001,
        apiUrl: 'http://localhost:5001/api'
      },
      docker: {
        mongoUri: 'mongodb://mongo:27017/pet-health-test-docker',
        redisUrl: 'redis://redis:6379',
        backendPort: 5000,
        frontendPort: 3000,
        apiUrl: 'http://backend:5000/api'
      }
    };
  }

  log(message, level = 'info') {
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

  async setupEnvironment() {
    this.log(`Setting up test environment: ${this.environment}`);
    
    try {
      await this.checkPrerequisites();
      await this.setupDatabase();
      await this.setupBackend();
      await this.setupFrontend();
      await this.initializeTestData();
      await this.healthCheck();
      
      this.log('Test environment setup completed successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Environment setup failed: ${error.message}`, 'error');
      await this.cleanup();
      throw error;
    }
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');
    
    const requirements = [
      { command: 'node --version', name: 'Node.js' },
      { command: 'npm --version', name: 'npm' }
    ];

    if (this.environment !== 'docker') {
      requirements.push(
        { command: 'mongod --version', name: 'MongoDB', optional: true },
        { command: 'redis-server --version', name: 'Redis', optional: true }
      );
    }

    for (const req of requirements) {
      try {
        const version = execSync(req.command, { encoding: 'utf8', stdio: 'pipe' });
        this.log(`${req.name}: ${version.trim().split('\n')[0]}`, 'debug');
      } catch (error) {
        if (req.optional) {
          this.log(`${req.name} not found (will use services)`, 'warning');
        } else {
          throw new Error(`${req.name} is required but not found`);
        }
      }
    }
  }

  async setupDatabase() {
    this.log('Setting up database...');
    
    const config = this.config[this.environment];
    
    if (this.environment === 'docker') {
      // Database will be handled by docker-compose
      return;
    }

    // Wait for MongoDB to be ready
    await this.waitForService('MongoDB', config.mongoUri, async () => {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(config.mongoUri);
      await client.connect();
      await client.db().admin().ping();
      await client.close();
    });

    // Wait for Redis to be ready
    await this.waitForService('Redis', config.redisUrl, async () => {
      const redis = require('redis');
      const client = redis.createClient({ url: config.redisUrl });
      await client.connect();
      await client.ping();
      await client.quit();
    });

    this.log('Database services are ready', 'success');
  }

  async setupBackend() {
    this.log('Setting up backend...');
    
    const config = this.config[this.environment];
    const backendDir = path.join(__dirname, '../../../backend');
    
    // Set environment variables
    const envVars = {
      NODE_ENV: 'test',
      MONGODB_URI: config.mongoUri,
      REDIS_URL: config.redisUrl,
      PORT: config.backendPort.toString(),
      JWT_SECRET: `test-jwt-secret-${Date.now()}`,
      LOG_LEVEL: 'error' // Reduce log noise in tests
    };

    // Write .env file for backend
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(path.join(backendDir, '.env.test'), envContent);

    // Build backend if needed
    if (!fs.existsSync(path.join(backendDir, 'dist'))) {
      this.log('Building backend...');
      execSync('npm run build', { cwd: backendDir, stdio: 'pipe' });
    }

    // Start backend server
    this.log('Starting backend server...');
    this.backendProcess = spawn('npm', ['start'], {
      cwd: backendDir,
      env: { ...process.env, ...envVars },
      stdio: this.verbose ? 'inherit' : 'pipe'
    });

    // Wait for backend to be ready
    await this.waitForService('Backend', config.apiUrl + '/health', async () => {
      const response = await fetch(config.apiUrl + '/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });

    this.log('Backend server is ready', 'success');
  }

  async setupFrontend() {
    if (this.environment === 'ci') {
      // In CI, we don't need to start the frontend dev server
      // Tests will run against the built frontend
      return;
    }

    this.log('Setting up frontend...');
    
    const config = this.config[this.environment];
    const frontendDir = path.join(__dirname, '../../..');
    
    // Set environment variables
    const envVars = {
      VITE_API_URL: config.apiUrl,
      VITE_ENV: 'test'
    };

    // Write .env file for frontend
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(path.join(frontendDir, '.env.test'), envContent);

    // Start frontend dev server
    this.log('Starting frontend dev server...');
    this.frontendProcess = spawn('npm', ['run', 'dev', '--', '--port', config.frontendPort.toString()], {
      cwd: frontendDir,
      env: { ...process.env, ...envVars },
      stdio: this.verbose ? 'inherit' : 'pipe'
    });

    // Wait for frontend to be ready
    await this.waitForService('Frontend', `http://localhost:${config.frontendPort}`, async () => {
      const response = await fetch(`http://localhost:${config.frontendPort}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });

    this.log('Frontend dev server is ready', 'success');
  }

  async initializeTestData() {
    this.log('Initializing test data...');
    
    try {
      // Run test data initialization script
      const dataManager = require('../utils/test-data-manager');
      await dataManager.initializeTestEnvironment();
      
      this.log('Test data initialized', 'success');
    } catch (error) {
      this.log(`Test data initialization failed: ${error.message}`, 'warning');
      // Don't fail the setup for data initialization issues
    }
  }

  async healthCheck() {
    this.log('Performing health check...');
    
    const config = this.config[this.environment];
    const checks = [
      {
        name: 'Backend Health',
        url: config.apiUrl + '/health',
        timeout: 5000
      }
    ];

    if (this.environment !== 'ci') {
      checks.push({
        name: 'Frontend',
        url: `http://localhost:${config.frontendPort}`,
        timeout: 5000
      });
    }

    for (const check of checks) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), check.timeout);
        
        const response = await fetch(check.url, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.log(`${check.name}: ✅ Healthy`, 'success');
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        this.log(`${check.name}: ❌ Failed (${error.message})`, 'error');
        throw new Error(`Health check failed for ${check.name}`);
      }
    }
  }

  async waitForService(name, url, testFn, maxAttempts = 30) {
    this.log(`Waiting for ${name} to be ready...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await testFn();
        this.log(`${name} is ready (attempt ${attempt}/${maxAttempts})`, 'success');
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`${name} failed to start after ${maxAttempts} attempts: ${error.message}`);
        }
        
        if (this.verbose) {
          this.log(`${name} not ready yet (attempt ${attempt}/${maxAttempts}): ${error.message}`, 'debug');
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async cleanup() {
    this.log('Cleaning up test environment...');
    
    // Stop processes
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.log('Backend process terminated');
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
      this.log('Frontend process terminated');
    }

    // Clean up test data
    try {
      const dataManager = require('../utils/test-data-manager');
      await dataManager.cleanup();
      this.log('Test data cleaned up');
    } catch (error) {
      this.log(`Test data cleanup failed: ${error.message}`, 'warning');
    }

    // Remove temporary env files
    const envFiles = [
      path.join(__dirname, '../../../backend/.env.test'),
      path.join(__dirname, '../../.env.test')
    ];

    for (const envFile of envFiles) {
      try {
        if (fs.existsSync(envFile)) {
          fs.unlinkSync(envFile);
          this.log(`Removed ${envFile}`);
        }
      } catch (error) {
        this.log(`Failed to remove ${envFile}: ${error.message}`, 'warning');
      }
    }

    this.log('Cleanup completed', 'success');
  }

  // Graceful shutdown handler
  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.log(`Received ${signal}, shutting down gracefully...`);
        await this.cleanup();
        process.exit(0);
      });
    });

    process.on('uncaughtException', async (error) => {
      this.log(`Uncaught exception: ${error.message}`, 'error');
      await this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      this.log(`Unhandled rejection: ${reason}`, 'error');
      await this.cleanup();
      process.exit(1);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  
  const options = {
    environment: process.env.TEST_ENV || 'ci',
    verbose: args.includes('--verbose') || args.includes('-v'),
    timeout: parseInt(process.env.SETUP_TIMEOUT) || 300000
  };

  const manager = new TestEnvironmentManager(options);
  manager.setupGracefulShutdown();

  try {
    switch (command) {
      case 'setup':
        await manager.setupEnvironment();
        break;
      case 'cleanup':
        await manager.cleanup();
        break;
      case 'health':
        await manager.healthCheck();
        break;
      default:
        console.log('Usage: node setup-test-env.js [setup|cleanup|health] [--verbose]');
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

module.exports = { TestEnvironmentManager };