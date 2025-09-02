import User, { IUser } from '../../src/models/User';
import mongoose from 'mongoose';

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // 密码应该被加密
      expect(savedUser.role).toBe('user'); // 默认角色
      expect(savedUser.isActive).toBe(true); // 默认激活
      expect(savedUser.isVerified).toBe(false); // 默认未验证
      expect(savedUser.preferences.notifications).toBe(true);
      expect(savedUser.preferences.emailUpdates).toBe(true);
      expect(savedUser.preferences.language).toBe('zh-CN');
      expect(savedUser.stats.totalAnalysis).toBe(0);
      expect(savedUser.stats.totalPosts).toBe(0);
      expect(savedUser.stats.reputation).toBe(0);
    });

    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('should not hash password if not modified', async () => {
      const userData = {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();
      const originalPassword = user.password;

      // 修改其他字段
      user.username = 'updateduser';
      await user.save();

      expect(user.password).toBe(originalPassword);
    });
  });

  describe('User Validation', () => {
    it('should require username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('用户名是必需的');
    });

    it('should require email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('邮箱是必需的');
    });

    it('should require password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('密码是必需的');
    });

    it('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('请输入有效的邮箱地址');
    });

    it('should validate username format', async () => {
      const userData = {
        username: 'test@user', // 包含非法字符
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('用户名只能包含字母、数字、下划线和中文字符');
    });

    it('should validate username length', async () => {
      const userData = {
        username: 'a', // 太短
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('用户名至少需要2个字符');
    });

    it('should validate password length', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // 太短
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('密码至少需要6个字符');
    });

    it('should validate bio length', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        profile: {
          bio: 'a'.repeat(501) // 超过500字符
        }
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('个人简介不能超过500个字符');
    });

    it('should enforce unique username', async () => {
      const userData1 = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'testuser', // 相同用户名
        email: 'test2@example.com',
        password: 'password123'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData1 = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'testuser2',
        email: 'test@example.com', // 相同邮箱
        password: 'password123'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    let user: IUser;

    beforeEach(async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      user = new User(userData);
      await user.save();
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('User Role Validation', () => {
    it('should accept valid roles', async () => {
      const roles = ['user', 'admin', 'moderator'];
      
      for (const role of roles) {
        const userData = {
          username: `testuser_${role}`,
          email: `test_${role}@example.com`,
          password: 'password123',
          role: role as 'user' | 'admin' | 'moderator'
        };

        const user = new User(userData);
        const savedUser = await user.save();
        expect(savedUser.role).toBe(role);
      }
    });

    it('should reject invalid roles', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid_role' as any
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Profile', () => {
    it('should save profile information', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        profile: {
          firstName: '张',
          lastName: '三',
          phone: '13800138000',
          location: '北京',
          bio: '这是我的个人简介'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.profile.firstName).toBe('张');
      expect(savedUser.profile.lastName).toBe('三');
      expect(savedUser.profile.phone).toBe('13800138000');
      expect(savedUser.profile.location).toBe('北京');
      expect(savedUser.profile.bio).toBe('这是我的个人简介');
    });
  });

  describe('User Preferences', () => {
    it('should save custom preferences', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        preferences: {
          notifications: false,
          emailUpdates: false,
          language: 'en-US'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.preferences.notifications).toBe(false);
      expect(savedUser.preferences.emailUpdates).toBe(false);
      expect(savedUser.preferences.language).toBe('en-US');
    });
  });
});